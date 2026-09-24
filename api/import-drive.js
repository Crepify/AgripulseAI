/**
 * GET /api/import-drive
 *
 * Temporary helper: download AgriPulseAI-secure-apis.zip from Google Drive,
 * extract text/source entries, and return them as JSON so the agent workspace
 * can integrate the API functions.
 *
 * Query:
 *   ?mode=list   → only entry names + sizes (default)
 *   ?mode=files  → text file contents (source/docs only; binaries skipped)
 *   ?path=api/x  → single file content (with mode=files or alone)
 *
 * Server-side only: Drive is unreachable from some sandboxes; Vercel can fetch it.
 */

import { inflateRawSync } from "node:zlib";

const DRIVE_FILE_ID = "1jEDCN3AvsgwCuxn05S49aH-lgWwugocd";
const MAX_TEXT_BYTES = 2 * 1024 * 1024; // skip huge text blobs (package-lock ok, models no)

const TEXT_EXT = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".md", ".txt",
  ".html", ".css", ".scss", ".env", ".example", ".yml", ".yaml", ".toml",
  ".gitignore", ".npmrc", "", // extensionless files like Dockerfile/README handled via name
]);
const SKIP_DIR_PREFIX = [
  "public/models/", "node_modules/", ".git/", "dist/", "build/",
];
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".woff", ".woff2",
  ".ttf", ".eot", ".mp3", ".mp4", ".wasm", ".tflite", ".bin", ".pdf", ".zip",
]);

function isTextEntry(name) {
  const lower = name.toLowerCase();
  if (SKIP_DIR_PREFIX.some((p) => lower.startsWith(p))) return false;
  if (name.endsWith("/")) return false;
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  if (SKIP_EXT.has(ext)) return false;
  if (TEXT_EXT.has(ext)) return true;
  // extensionless docs like Makefile, Dockerfile, LICENSE
  return dot < 0 || dot === 0;
}

async function downloadFromDrive() {
  const session = { cookie: "" };
  const headers = {
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  };

  const firstUrl = `https://drive.google.com/uc?export=download&id=${DRIVE_FILE_ID}`;
  let res = await fetch(firstUrl, { headers, redirect: "follow" });
  const contentType = res.headers.get("content-type") || "";
  const setCookie = res.headers.get("set-cookie") || "";
  if (setCookie) {
    session.cookie = setCookie
      .split(",")
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");
  }

  let body = Buffer.from(await res.arrayBuffer());
  const asText = body.subarray(0, 512).toString("utf8");
  const isHtml = contentType.includes("text/html") || asText.includes("<!DOCTYPE html") || asText.includes("<html");

  if (isHtml) {
    const html = body.toString("utf8");
    // confirm token from cookie name download_warning_* or hidden form fields
    let confirm = "";
    const cookieWarn = session.cookie.match(/download_warning[^=]*=([^;]+)/);
    if (cookieWarn) confirm = cookieWarn[1];
    const confirmMatch = html.match(/name=["']confirm["']\s+value=["']([^"']+)["']/);
    if (confirmMatch) confirm = confirmMatch[1];
    if (!confirm) confirm = "t";
    const uuidMatch = html.match(/name=["']uuid["']\s+value=["']([^"']+)["']/);
    const idMatch = html.match(/name=["']id["']\s+value=["']([^"']+)["']/);
    const fileId = idMatch ? idMatch[1] : DRIVE_FILE_ID;

    let dl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=${encodeURIComponent(confirm)}`;
    if (uuidMatch) dl += `&uuid=${encodeURIComponent(uuidMatch[1])}`;

    const h2 = { ...headers };
    if (session.cookie) h2.cookie = session.cookie;
    res = await fetch(dl, { headers: h2, redirect: "follow" });
    body = Buffer.from(await res.arrayBuffer());
    const ct2 = res.headers.get("content-type") || "";
    const head2 = body.subarray(0, 512).toString("utf8");
    if (ct2.includes("text/html") && head2.includes("<html")) {
      // one more attempt with confirm=t only
      const dl2 = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(DRIVE_FILE_ID)}&export=download&confirm=t`;
      res = await fetch(dl2, { headers: h2, redirect: "follow" });
      body = Buffer.from(await res.arrayBuffer());
    }
  }

  if (body.length < 100 || body[0] !== 0x50 || body[1] !== 0x4b) {
    // PK magic missing
    const preview = body.subarray(0, 200).toString("utf8");
    const err = new Error(`Download did not return a zip (${body.length} bytes). Preview: ${preview}`);
    err.status = 502;
    throw err;
  }
  return body;
}

/** Minimal ZIP reader (central directory + inflate). */
function listZipEntries(buf) {
  // Find EOCD (signature 0x06054b50)
  let eocd = -1;
  const min = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw Object.assign(new Error("EOCD not found"), { status: 502 });

  const total = buf.readUInt16LE(eocd + 10);
  let cdOffset = buf.readUInt32LE(eocd + 16);

  // Zip64 EOCD if needed
  if (cdOffset === 0xffffffff || total === 0xffff) {
    for (let i = eocd - 20; i >= Math.max(0, eocd - 56); i--) {
      if (buf.readUInt32LE(i) === 0x06064b50) {
        const zip64 = Number(buf.readBigUInt64LE(i + 8));
        const zip64cd = Number(buf.readBigUInt64LE(i + 48));
        if (zip64cd) cdOffset = zip64cd;
        if (zip64 && zip64 !== 0xffff) {
          // total entries at +32
          var zip64Total = Number(buf.readBigUInt64LE(i + 32));
        }
        break;
      }
    }
    if (typeof zip64Total === "number" && zip64Total) total = zip64Total;
  }

  const entries = [];
  let p = cdOffset;
  for (let n = 0; n < total && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localHeaderOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");

    // Zip64 extra field for large sizes/offsets
    let cs = compSize;
    let us = uncompSize;
    let lh = localHeaderOffset;
    if (cs === 0xffffffff || us === 0xffffffff || lh === 0xffffffff) {
      let ep = p + 46 + nameLen;
      const end = ep + extraLen;
      while (ep + 4 <= end) {
        const hid = buf.readUInt16LE(ep);
        const hsz = buf.readUInt16LE(ep + 2);
        if (hid === 0x0001) {
          let q = ep + 4;
          if (us === 0xffffffff && q + 8 <= end) {
            us = Number(buf.readBigUInt64LE(q));
            q += 8;
          }
          if (cs === 0xffffffff && q + 8 <= end) {
            cs = Number(buf.readBigUInt64LE(q));
            q += 8;
          }
          if (lh === 0xffffffff && q + 8 <= end) {
            lh = Number(buf.readBigUInt64LE(q));
          }
          break;
        }
        ep += 4 + hsz;
      }
    }

    entries.push({ name, method, compSize: cs, uncompSize: us, localHeaderOffset: lh });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readZipEntry(buf, entry) {
  const o = entry.localHeaderOffset;
  if (buf.readUInt32LE(o) !== 0x04034b50) {
    throw new Error(`Bad local header for ${entry.name}`);
  }
  const nameLen = buf.readUInt16LE(o + 26);
  const extraLen = buf.readUInt16LE(o + 28);
  const start = o + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + entry.compSize);
  if (entry.method === 0) return Buffer.from(data);
  if (entry.method === 8) {
    return inflateRawSync(data);
  }
  throw Object.assign(new Error(`Unsupported compression method ${entry.method} for ${entry.name}`), {
    status: 502,
  });
}

async function getZipBuffer() {
  const { getCache, setCache } = globalThis.__driveZipCache || {};
  // simple in-instance cache
  if (globalThis.__driveZipCache && globalThis.__driveZipCache.buf) {
    return globalThis.__driveZipCache.buf;
  }
  const buf = await downloadFromDrive();
  globalThis.__driveZipCache = { buf, at: Date.now() };
  return buf;
}

export async function GET(request) {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "list";
    const path = url.searchParams.get("path") || "";

    const t0 = Date.now();
    const buf = await getZipBuffer();
    const entries = listZipEntries(buf);
    const downloadMs = Date.now() - t0;

    if (mode === "list") {
      return Response.json(
        {
          ok: true,
          bytes: buf.length,
          downloadMs,
          count: entries.length,
          entries: entries.map((e) => ({
            name: e.name,
            size: e.uncompSize,
            method: e.method,
            text: isTextEntry(e.name),
          })),
        },
        { headers: cors },
      );
    }

    // mode=files
    const files = [];
    for (const e of entries) {
      if (!isTextEntry(e.name)) continue;
      if (e.uncompSize > MAX_TEXT_BYTES) continue;
      if (path && e.name !== path && !e.name.endsWith("/" + path)) continue;
      try {
        const data = readZipEntry(buf, e);
        files.push({
          name: e.name,
          size: e.uncompSize,
          content: data.toString("utf8"),
        });
      } catch (err) {
        files.push({ name: e.name, size: e.uncompSize, error: String(err.message || err) });
      }
      if (path) break;
    }

    if (path && files.length === 1 && !files[0].error) {
      return new Response(files[0].content, {
        headers: { ...cors, "content-type": "text/plain; charset=utf-8" },
      });
    }

    return Response.json({ ok: true, downloadMs, count: files.length, files }, { headers: cors });
  } catch (err) {
    return Response.json(
      { ok: false, error: String(err.message || err), status: err.status || 500 },
      { status: err.status || 500, headers: cors },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

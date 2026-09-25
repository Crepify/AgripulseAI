import { T } from '../data/translations';

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const k of Object.keys(source || {})) {
    const tv = target?.[k];
    const sv = source[k];
    if (isPlainObject(tv) && isPlainObject(sv)) {
      out[k] = deepMerge(tv, sv);
    } else if (sv !== undefined) {
      out[k] = sv;
    }
  }
  return out;
}

/**
 * Deep-merged translation lookup: every nested section falls back to English
 * so that partially-translated languages never render undefined.
 */
export function useTranslation(lang) {
  const base = T.en || {};
  const over = T[lang] || {};
  return deepMerge(base, over);
}

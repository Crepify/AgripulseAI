import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import React from 'react'

class RootErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={hasError:false, error:null}; }
  static getDerivedStateFromError(e){ return {hasError:true, error:e}; }
  componentDidCatch(err, info){ console.error('AgriPulse crash', err, info); try { localStorage.setItem('ap_last_error', JSON.stringify({ msg: String(err?.message || err), at: new Date().toISOString(), page: location.pathname })); } catch {} }
  render(){
    if(this.state.hasError){
      return (
        <div style={{minHeight:'100vh', background:'#f4f7f5', color:'#111', padding:'24px', fontFamily:'Inter, system-ui, sans-serif'}}>
          <h1 style={{fontSize:'20px', fontWeight:800}}>AgriPulse — recovery needed</h1>
          <p style={{marginTop:'8px', fontSize:'13px', color:'#555'}}>The app hit an error. This is usually a cached old version. Clear cache below.</p>
          <pre style={{marginTop:'12px', background:'#fff', border:'1px solid #ddd', padding:'12px', borderRadius:'12px', fontSize:'11px', whiteSpace:'pre-wrap', overflowX:'auto'}}>{String(this.state.error?.message || this.state.error || 'Unknown error')}</pre>
          <div style={{marginTop:'16px', display:'flex', gap:'8px', flexWrap:'wrap'}}>
            <button onClick={()=>{
              if('serviceWorker' in navigator){ navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{}); }
              if(window.caches){ caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{}); }
              setTimeout(()=> location.reload(), 300);
            }} style={{padding:'10px 16px', background:'#10b981', color:'#fff', borderRadius:'12px', fontWeight:800, border:'none', cursor:'pointer'}}>Refresh app (keeps your login)</button>
            <button onClick={()=>location.reload()} style={{padding:'10px 16px', background:'#fff', border:'1px solid #ddd', borderRadius:'12px', fontWeight:700, cursor:'pointer'}}>Reload</button>
          </div>
          <p style={{marginTop:'10px', fontSize:'11px', color:'#999'}}>Refreshing clears only the app cache — your login and settings stay. If it keeps happening, screenshot this message for the team.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Auto-recover ONLY from genuinely stale hashed assets (Vercel deletes old
// assets after deploys; the SW may serve an old index.html that points at
// deleted chunks). Anything else — network blips ('Failed to fetch'), app
// errors from /assets/*.js (which is ALL prod code!) — must NOT reload:
// a reload bounces the farmer back to the start page, and a flaky connection
// would loop it forever. Also rate-limited to once per 30s.
if (typeof window !== 'undefined') {
  const STALE_ASSET_MSG = /Loading chunk|Importing a module|dynamically imported module|Unexpected token|error loading dynamically imported/i;
  const lastReloadKey = 'ap_asset_reload_at';
  const refreshShell = () => {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(()=>{});
      }
      if (window.caches) {
        caches.keys().then(ks => ks.forEach(k => { if(k.includes('agripulse-shell')) caches.delete(k); })).catch(()=>{});
      }
    } catch {}
  };
  const maybeReload = (detail) => {
    try {
      const last = Number(sessionStorage.getItem(lastReloadKey) || 0);
      if (Date.now() - last < 30000) return; // never loop
      sessionStorage.setItem(lastReloadKey, String(Date.now()));
    } catch {}
    console.warn('[AgriPulse] stale asset detected — refreshing once', detail);
    refreshShell();
    setTimeout(()=> { try { location.reload(); } catch {} }, 800);
  };
  window.addEventListener('error', (e) => {
    const msg = e?.message || '';
    const src = e?.filename || '';
    // ONLY stale-asset signatures (message-based). A plain app error also
    // has src=/assets/... in prod — reloading for those was resetting
    // farmers to the start page.
    if (STALE_ASSET_MSG.test(msg) || (src.includes('/assets/') && STALE_ASSET_MSG.test(`${msg} ${src}`))) {
      maybeReload(`${src} ${msg}`);
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    const m = String(e?.reason?.message || e?.reason || '');
    if (STALE_ASSET_MSG.test(m) && m.includes('assets')) {
      maybeReload(m);
    } else if (STALE_ASSET_MSG.test(m)) {
      refreshShell(); // prime the cache; no reload needed for a one-off
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)

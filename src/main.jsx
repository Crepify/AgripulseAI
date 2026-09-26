import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import React from 'react'

class RootErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={hasError:false, error:null}; }
  static getDerivedStateFromError(e){ return {hasError:true, error:e}; }
  componentDidCatch(err, info){ console.error('AgriPulse crash', err, info); }
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
              try{ localStorage.clear(); sessionStorage.clear(); }catch{}
              setTimeout(()=> location.reload(), 300);
            }} style={{padding:'10px 16px', background:'#10b981', color:'#fff', borderRadius:'12px', fontWeight:800, border:'none', cursor:'pointer'}}>Clear cache & reload</button>
            <button onClick={()=>location.reload()} style={{padding:'10px 16px', background:'#fff', border:'1px solid #ddd', borderRadius:'12px', fontWeight:700, cursor:'pointer'}}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Auto-recover from stale hashed asset 404s (Vercel deletes old assets, SW may serve old index.html)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    const msg = e?.message || '';
    // ONLY genuine stale-asset failures after a deploy — never plain runtime
    // errors (filename says nothing) and never 'Failed to fetch' (normal for
    // offline-mode API calls): one uncaught error must not reload the page
    // mid-login and wipe what the farmer was typing.
    const src = '';
    if (msg.includes('Loading chunk') || msg.includes('Importing a module') || msg.includes('Unexpected token')) {
      console.warn('[AgriPulse] asset load failed, clearing SW cache', src, msg);
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(()=>{});
        }
        if (window.caches) {
          caches.keys().then(ks => ks.forEach(k => { if(k.includes('agripulse-shell')) caches.delete(k); })).catch(()=>{});
        }
      } catch {}
      setTimeout(()=> { try { location.reload(); } catch {} }, 800);
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    const m = String(e?.reason?.message || e?.reason || '');
    if ((m.includes('Failed to fetch') || m.includes('Loading chunk') || m.includes('Importing')) && m.includes('assets')) {
      console.warn('[AgriPulse] chunk fetch failed', m);
      if (window.caches) {
        caches.keys().then(ks => ks.forEach(k => { if(k.includes('agripulse-shell')) caches.delete(k); })).catch(()=>{});
      }
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

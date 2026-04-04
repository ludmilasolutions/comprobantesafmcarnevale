// ════════════════════════════════
// APP.JS — Utilidades y navegación
// ════════════════════════════════

// ── FIREBASE ──
const firebaseConfig = {
  apiKey: "AIzaSyDFVZ99Hqs9xvfJPmyxARaX8ZlndF5fpMM",
  authDomain: "ferreteriacarnevale-918a0.firebaseapp.com",
  projectId: "ferreteriacarnevale-918a0",
  storageBucket: "ferreteriacarnevale-918a0.firebasestorage.app",
  messagingSenderId: "254608423500",
  appId: "1:254608423500:web:568b03c037bf25f64912e9",
  measurementId: "G-BNHNFVD3H9"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── UTILS ──
function fechaHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatFechaLarga(str) {
  const [y,m,d] = str.split('-');
  const M = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${parseInt(d)} de ${M[parseInt(m)-1]} de ${y}`;
}
function formatHora(ts) {
  if(!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
}
function fmt(n) {
  return '$'+(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg,tipo='success') {
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast ${tipo}`;
  void t.offsetWidth; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

// ── NAVEGACIÓN ──
function goTo(name) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  window.scrollTo(0,0);
  if(name==='ventas')      initVentas();
  if(name==='presupuesto') initPresupuesto();
  if(name==='arca')        initArca();
}
function goHome() {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-home').classList.add('active');
  window.scrollTo(0,0);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('homeDateLabel').textContent = formatFechaLarga(fechaHoy());
});

// ── SERVICE WORKER ──
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW:',e)));
}

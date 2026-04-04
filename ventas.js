// ════════════════════════════════
// VENTAS
// ════════════════════════════════
let turnoActivo=null, tipoSel='tarjeta';
let unsubHoy=null, unsubHist=null, filtroHoy='all';
let ventasHoyCache=[], ventasHistCache=[], ventaDelId=null;
let chartHoy=null, chartHist=null, ventasInited=false;

function initVentas() {
  if(ventasInited) return;
  ventasInited = true;
  const hoy = fechaHoy();
  document.getElementById('fechaHoy').textContent      = formatFechaLarga(hoy);
  document.getElementById('fechaHoyLabel').textContent = formatFechaLarga(hoy);
  document.getElementById('fechaHistorial').value      = hoy;
  const tg=localStorage.getItem('turno'), tf=localStorage.getItem('turnoFecha');
  if(tg && ['mañana','tarde'].includes(tg) && tf===hoy) { turnoActivo=tg; updateTurnoBadge(); }
  else { localStorage.removeItem('turno'); localStorage.removeItem('turnoFecha'); openTurnoOverlay(); }
  suscribirHoy();
}

function openTurnoOverlay() { document.getElementById('turnoOverlay').classList.add('show'); }
function setTurno(t) {
  if(!['mañana','tarde'].includes(t)) return;
  turnoActivo=t; localStorage.setItem('turno',t); localStorage.setItem('turnoFecha',fechaHoy());
  updateTurnoBadge(); document.getElementById('turnoOverlay').classList.remove('show');
}
function updateTurnoBadge() {
  document.getElementById('turnoBadge').className = 'turno-badge '+turnoActivo;
  document.getElementById('turnoLabel').textContent = turnoActivo==='mañana'?'☀️ Mañana':'🌆 Tarde';
}
function showTab(name) {
  document.querySelectorAll('#screen-ventas .section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('#screen-ventas .tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('sec-'+name).classList.add('active');
  document.querySelectorAll('#screen-ventas .tab')[['cargar','hoy','historial'].indexOf(name)].classList.add('active');
  if(name==='historial') cargarHistorial();
}
function selectTipo(t) {
  tipoSel=t;
  document.getElementById('btn-tarjeta').classList.toggle('selected',t==='tarjeta');
  document.getElementById('btn-debito').classList.toggle('selected',t==='debito');
  document.getElementById('btn-transferencia').classList.toggle('selected',t==='transferencia');
}
async function guardarVenta() {
  const monto=parseFloat(document.getElementById('monto').value);
  const comp=document.getElementById('comprobante').value.trim();
  if(!monto||monto<=0){document.getElementById('monto').focus();return;}
  if(!turnoActivo){openTurnoOverlay();return;}
  const btn=document.getElementById('btnGuardar');
  btn.disabled=true; btn.textContent='Guardando...';
  try {
    await db.collection('ventas').add({
      fecha:fechaHoy(), timestamp:firebase.firestore.FieldValue.serverTimestamp(),
      turno:turnoActivo, tipo:tipoSel, monto, comprobante:comp||''
    });
    document.getElementById('monto').value='';
    document.getElementById('comprobante').value='';
    showToast('✓ Venta guardada','success');
  } catch(e){alert('Error: '+e.message);}
  btn.disabled=false; btn.textContent='Guardar venta';
}
function setFiltroHoy(f) {
  filtroHoy=f;
  document.getElementById('filtro-all').className    ='filtro-btn'+(f==='all'?'    active-all':'');
  document.getElementById('filtro-mañana').className ='filtro-btn'+(f==='mañana'?' active-mañana':'');
  document.getElementById('filtro-tarde').className  ='filtro-btn'+(f==='tarde'?' active-tarde':'');
  renderVentas(ventasHoyCache,'listHoy',null,'hoy');
}
function suscribirHoy() {
  if(unsubHoy) unsubHoy();
  unsubHoy = db.collection('ventas').where('fecha','==',fechaHoy()).orderBy('timestamp','asc')
    .onSnapshot(snap=>{
      document.getElementById('indexWarning').classList.remove('show');
      const v=snap.docs.map(d=>({id:d.id,...d.data()}));
      ventasHoyCache=v; renderVentas(v,'listHoy',null,'hoy');
    }, err=>{
      document.getElementById('indexWarning').classList.add('show');
      db.collection('ventas').where('fecha','==',fechaHoy()).get().then(snap=>{
        const v=snap.docs.map(d=>({id:d.id,...d.data()}));
        ventasHoyCache=v; renderVentas(v,'listHoy',null,'hoy');
      });
    });
}
function cargarHistorial() {
  const fecha=document.getElementById('fechaHistorial').value; if(!fecha) return;
  if(unsubHist){unsubHist();unsubHist=null;}
  document.getElementById('listHistorial').innerHTML='<div class="loader">Cargando...</div>';
  document.getElementById('exportRow').style.display='none';
  const esHoy=fecha===fechaHoy();
  const query=db.collection('ventas').where('fecha','==',fecha).orderBy('timestamp','asc');
  function handleSnap(snap){
    const v=snap.docs.map(d=>({id:d.id,...d.data()}));
    ventasHistCache=v; renderVentas(v,'listHistorial',fecha,'historial');
    document.getElementById('exportRow').style.display=v.length>0?'flex':'none';
  }
  function handleErr(){
    db.collection('ventas').where('fecha','==',fecha).get().then(handleSnap)
      .catch(e=>{document.getElementById('listHistorial').innerHTML=`<div class="empty-state"><div class="empty-icon">⚠️</div>${e.message}</div>`;});
  }
  if(esHoy) unsubHist=query.onSnapshot(handleSnap,handleErr);
  else query.get().then(handleSnap).catch(handleErr);
}
function renderVentas(all,cid,fLabel,ctx) {
  const el=document.getElementById(cid);
  const v=(ctx==='hoy'&&filtroHoy!=='all')?all.filter(x=>x.turno===filtroHoy):all;
  if(v.length===0){el.innerHTML=`<div class="empty-state"><div class="empty-icon">📭</div>No hay ventas registradas</div>`;return;}
  const mañ=v.filter(x=>x.turno==='mañana'), tar=v.filter(x=>x.turno==='tarde');
  const tT=v.filter(x=>x.tipo==='tarjeta').reduce((s,x)=>s+(x.monto||0),0);
  const tD=v.filter(x=>x.tipo==='debito').reduce((s,x)=>s+(x.monto||0),0);
  const tTr=v.filter(x=>x.tipo==='transferencia').reduce((s,x)=>s+(x.monto||0),0);
  const tG=tT+tD+tTr;
  const cid2=`chart-${ctx}`;
  let html=`<div class="chart-wrap"><div class="chart-title">Distribución por medio de pago</div><div class="chart-inner"><div class="chart-canvas-wrap"><canvas id="${cid2}"></canvas></div><div class="chart-legend">
    ${tT>0?`<div class="legend-item"><div class="legend-left"><div class="legend-dot" style="background:var(--blue)"></div>💳 Tarjeta</div><div class="legend-val" style="color:var(--blue)">${fmt(tT)}</div></div>`:''}
    ${tD>0?`<div class="legend-item"><div class="legend-left"><div class="legend-dot" style="background:var(--orange)"></div>🏧 Débito</div><div class="legend-val" style="color:var(--orange)">${fmt(tD)}</div></div>`:''}
    ${tTr>0?`<div class="legend-item"><div class="legend-left"><div class="legend-dot" style="background:var(--green)"></div>📲 Transf.</div><div class="legend-val" style="color:var(--green)">${fmt(tTr)}</div></div>`:''}
  </div></div></div>`;
  if(mañ.length>0) html+=renderTurnoBlock(mañ,'mañana');
  if(tar.length>0) html+=renderTurnoBlock(tar,'tarde');
  html+=`<div class="total-general-box"><div class="total-general-label">Total del día</div><div class="total-general-value">${fmt(tG)}</div></div>`;
  el.innerHTML=html;
  const cData=[],cColors=[],cLab=[];
  if(tT>0){cData.push(tT);cColors.push('#6c8ef5');cLab.push('Tarjeta');}
  if(tD>0){cData.push(tD);cColors.push('#fb923c');cLab.push('Débito');}
  if(tTr>0){cData.push(tTr);cColors.push('#3ecf8e');cLab.push('Transf.');}
  const cv=document.getElementById(cid2);
  if(cv){
    if(ctx==='hoy'&&chartHoy) chartHoy.destroy();
    if(ctx==='historial'&&chartHist) chartHist.destroy();
    const nc=new Chart(cv,{type:'doughnut',data:{labels:cLab,datasets:[{data:cData,backgroundColor:cColors,borderWidth:0,hoverOffset:4}]},options:{cutout:'72%',plugins:{legend:{display:false},tooltip:{enabled:false}},animation:{duration:400}}});
    if(ctx==='hoy') chartHoy=nc;
    if(ctx==='historial') chartHist=nc;
  }
}
function renderTurnoBlock(ventas,turno) {
  const em=turno==='mañana'?'🌅':'🌆', lab=turno==='mañana'?'Turno Mañana':'Turno Tarde';
  const tT=ventas.filter(v=>v.tipo==='tarjeta').reduce((s,v)=>s+(v.monto||0),0);
  const tD=ventas.filter(v=>v.tipo==='debito').reduce((s,v)=>s+(v.monto||0),0);
  const tTr=ventas.filter(v=>v.tipo==='transferencia').reduce((s,v)=>s+(v.monto||0),0);
  const tot=tT+tD+tTr;
  const tL=t=>({tarjeta:'💳 Tarjeta',debito:'🏧 Débito',transferencia:'📲 Transferencia'}[t]||t);
  const cards=ventas.map(v=>{
    const h=formatHora(v.timestamp), m=v.monto||0;
    return `<div class="venta-card-wrap"><div class="venta-card-delete-bg">🗑️</div>
      <div class="venta-card" data-id="${v.id}">
        <div class="venta-left">
          <span class="venta-tipo ${v.tipo}">${tL(v.tipo)}</span>
          <span class="venta-hora">${h}</span>
          ${v.comprobante?`<span class="venta-comprobante">Comp. #${v.comprobante}</span>`:''}
        </div>
        <div class="venta-right">
          <div class="venta-monto">${fmt(m)}</div>
          <button class="venta-del-btn" onclick="pedirEliminar('${v.id}','${m}','${v.tipo}','${v.turno}','${h}')">✕</button>
        </div>
      </div></div>`;
  }).join('');
  return `<div class="turno-block"><div class="turno-header"><span class="turno-pill ${turno}">${em} ${lab}</span></div>${cards}
    <div class="totales-box">
      ${tT>0?`<div class="total-row"><span class="label">💳 Tarjeta</span><span class="value" style="color:var(--blue)">${fmt(tT)}</span></div>`:''}
      ${tD>0?`<div class="total-row"><span class="label">🏧 Débito</span><span class="value" style="color:var(--orange)">${fmt(tD)}</span></div>`:''}
      ${tTr>0?`<div class="total-row"><span class="label">📲 Transferencia</span><span class="value" style="color:var(--green)">${fmt(tTr)}</span></div>`:''}
      <div class="total-row grand"><span class="label">Total ${lab}</span><span class="value">${fmt(tot)}</span></div>
    </div></div>`;
}
function pedirEliminar(id,monto,tipo,turno,hora) {
  ventaDelId=id;
  document.getElementById('confirmMonto').textContent=fmt(parseFloat(monto));
  const tL={tarjeta:'💳 Tarjeta',debito:'🏧 Débito',transferencia:'📲 Transferencia'}[tipo]||tipo;
  document.getElementById('confirmInfo').textContent=`${tL} · ${turno==='mañana'?'☀️ Mañana':'🌆 Tarde'}${hora?' · '+hora:''}`;
  document.getElementById('deleteOverlay').classList.add('show');
}
function closeDeleteOverlay(){document.getElementById('deleteOverlay').classList.remove('show');ventaDelId=null;}
async function confirmarEliminar(){
  if(!ventaDelId) return; const id=ventaDelId; closeDeleteOverlay();
  try{await db.collection('ventas').doc(id).delete();showToast('🗑️ Venta eliminada','deleted');
    if(document.getElementById('sec-historial').classList.contains('active')) cargarHistorial();
  }catch(e){alert('Error: '+e.message);}
}
function exportarCSV(){
  if(!ventasHistCache.length) return;
  const fecha=document.getElementById('fechaHistorial').value;
  const tL=t=>({tarjeta:'Tarjeta',debito:'Debito',transferencia:'Transferencia'}[t]||t);
  const headers=['Fecha','Turno','Tipo','Monto','Comprobante','Hora'];
  const rows=ventasHistCache.map(v=>[v.fecha,v.turno==='mañana'?'Mañana':'Tarde',tL(v.tipo),(v.monto||0).toFixed(2).replace('.',','),v.comprobante||'',formatHora(v.timestamp)]);
  const total=ventasHistCache.reduce((s,v)=>s+(v.monto||0),0);
  rows.push(['','','TOTAL',total.toFixed(2).replace('.',','),'','']);
  const csv=[headers,...rows].map(r=>r.map(c=>`"${c}"`).join(';')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=`ferreteria-carnevale-ventas-${fecha}.csv`; a.click(); URL.revokeObjectURL(url);
}

// Keyboard shortcuts
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('monto').addEventListener('keydown',e=>{if(e.key==='Enter') document.getElementById('comprobante').focus();});
  document.getElementById('comprobante').addEventListener('keydown',e=>{if(e.key==='Enter') guardarVenta();});
});

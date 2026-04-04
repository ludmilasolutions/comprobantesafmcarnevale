// ════════════════════════════════
// FACTURADOR ARCA
// ════════════════════════════════
let arcaAli=21, arcaItems=[], arcaIdCnt=0, arcaInited=false;

function initArca(){
  if(arcaInited) return; arcaInited=true;
  arcaAgregarItem();
}
function arcaSetAlicuota(pct){
  arcaAli=pct;
  document.querySelectorAll('.arca-ali-btn').forEach(b=>b.classList.toggle('selected',parseFloat(b.dataset.ali)===pct));
  document.getElementById('arca-ali-label').textContent=pct===10.5?'10,5':pct;
  arcaItems.forEach(item=>{
    const bruto=(item.qty||0)*(item.precio||0);
    const neto=arcaAli>0?bruto/(1+arcaAli/100):bruto;
    const el=document.getElementById(`an-${item.id}`);
    if(el) el.value=neto>0?neto.toFixed(2):'';
  });
  arcaRecalcular();
}
function arcaAgregarItem(){
  const id=++arcaIdCnt;
  arcaItems.push({id,desc:'',qty:1,precio:0});
  renderArcaItems();
}
function arcaEliminarItem(id){
  arcaItems=arcaItems.filter(i=>i.id!==id);
  if(arcaItems.length===0) arcaAgregarItem(); else {renderArcaItems();arcaRecalcular();}
}
function renderArcaItems(){
  document.getElementById('arca-items-list').innerHTML=arcaItems.map(item=>{
    const bruto=(item.qty||0)*(item.precio||0);
    const neto=arcaAli>0?bruto/(1+arcaAli/100):bruto;
    return `
      <div class="arca-item" id="ai-${item.id}">
        <div class="arca-item-top">
          <input class="arca-item-desc" type="text" placeholder="Descripción del producto"
            value="${escHtml(item.desc)}" oninput="arcaUpdDesc(${item.id},this.value)"/>
          <button class="arca-item-del" onclick="arcaEliminarItem(${item.id})">✕</button>
        </div>
        <div class="arca-item-nums">
          <div class="arca-item-field">
            <div class="arca-item-field-label">Cantidad</div>
            <input class="arca-num" type="number" min="1" step="1"
              value="${item.qty||1}" oninput="arcaUpd(${item.id},'qty',this.value)"/>
          </div>
          <div class="arca-item-field">
            <div class="arca-item-field-label">Precio c/IVA</div>
            <input class="arca-num" type="number" min="0" step="0.01" placeholder="0,00"
              value="${item.precio||''}" oninput="arcaUpd(${item.id},'precio',this.value)"/>
          </div>
          <div class="arca-item-field">
            <div class="arca-item-field-label">Neto gravado</div>
            <input class="arca-num" type="number" readonly id="an-${item.id}"
              value="${neto>0?neto.toFixed(2):''}"/>
          </div>
        </div>
      </div>`;
  }).join('');
  arcaRecalcular();
}
function arcaUpdDesc(id,val){const i=arcaItems.find(x=>x.id===id);if(i)i.desc=val;}
function arcaUpd(id,field,val){
  const i=arcaItems.find(x=>x.id===id); if(!i) return;
  i[field]=parseFloat(val)||0;
  const bruto=(i.qty||0)*(i.precio||0);
  const neto=arcaAli>0?bruto/(1+arcaAli/100):bruto;
  const el=document.getElementById(`an-${id}`);
  if(el) el.value=neto>0?neto.toFixed(2):'';
  arcaRecalcular();
}
function arcaRecalcular(){
  let tBruto=0, tNeto=0;
  arcaItems.forEach(i=>{
    const bruto=(i.qty||0)*(i.precio||0);
    const neto=arcaAli>0?bruto/(1+arcaAli/100):bruto;
    tBruto+=bruto; tNeto+=neto;
  });
  const tIva=tBruto-tNeto;
  document.getElementById('arca-neto-total').textContent  =fmt(tNeto);
  document.getElementById('arca-iva-total').textContent   =fmt(tIva);
  document.getElementById('arca-bruto-total').textContent =fmt(tBruto);
  document.getElementById('arca-neto-facturar').textContent=fmt(tNeto);
}
function arcaLimpiar(){arcaItems=[];arcaIdCnt=0;arcaAgregarItem();}
function arcaCompartir(){
  let tBruto=0,tNeto=0;
  const items=arcaItems.filter(i=>i.precio>0);
  let msg=`*Desglose IVA ${arcaAli}% \u2014 Ferretería Carnevale*\n\n`;
  items.forEach((i,idx)=>{
    const bruto=(i.qty||0)*(i.precio||0);
    const neto=arcaAli>0?bruto/(1+arcaAli/100):bruto;
    const iva=bruto-neto;
    tBruto+=bruto; tNeto+=neto;
    msg+=`${idx+1}. ${i.desc||'Producto'}\n   Precio c/IVA: ${fmt(bruto)}\n   Neto gravado: ${fmt(neto)}\n   IVA: ${fmt(iva)}\n\n`;
  });
  msg+=`*Total c/IVA: ${fmt(tBruto)}*\n*Neto a facturar en ARCA: ${fmt(tNeto)}*`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

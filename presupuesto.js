// ════════════════════════════════
// PRESUPUESTADOR
// ════════════════════════════════
let presItems=[], presIdCnt=0, presInited=false;

function initPresupuesto(){
  if(presInited) return; presInited=true;
  presAgregarItem();
  document.getElementById('pres-numero').value = String(Date.now()).slice(-4);
}
function presAgregarItem(){
  const id=++presIdCnt;
  presItems.push({id,desc:'',qty:1,precio:0});
  renderPresItems();
}
function presEliminarItem(id){
  presItems=presItems.filter(i=>i.id!==id);
  if(presItems.length===0) presAgregarItem(); else {renderPresItems();presRecalcular();}
}
function renderPresItems(){
  document.getElementById('pres-items-list').innerHTML=presItems.map(item=>`
    <div class="pres-item" id="pi-${item.id}">
      <div class="pres-item-row1">
        <input class="pres-item-desc" type="text" placeholder="Descripción del producto / servicio"
          value="${escHtml(item.desc)}" oninput="presUpdateDesc(${item.id},this.value)"/>
        <button class="pres-item-del" onclick="presEliminarItem(${item.id})">✕</button>
      </div>
      <div class="pres-item-row2">
        <input class="pres-item-num" type="number" placeholder="Cant." min="1" step="1"
          value="${item.qty||''}" oninput="presUpdate(${item.id},'qty',this.value)"/>
        <input class="pres-item-num" type="number" placeholder="Precio $" min="0" step="0.01"
          value="${item.precio||''}" oninput="presUpdate(${item.id},'precio',this.value)"/>
        <div class="pres-item-subtotal" id="ps-${item.id}">${fmt((item.qty||0)*(item.precio||0))}</div>
      </div>
    </div>`).join('');
  presRecalcular();
}
function presUpdateDesc(id,val){const i=presItems.find(x=>x.id===id);if(i)i.desc=val;}
function presUpdate(id,field,val){
  const i=presItems.find(x=>x.id===id); if(!i) return;
  i[field]=parseFloat(val)||0;
  const el=document.getElementById(`ps-${id}`);
  if(el) el.textContent=fmt((i.qty||0)*(i.precio||0));
  presRecalcular();
}
function presRecalcular(){
  const sub=presItems.reduce((s,i)=>s+(i.qty||0)*(i.precio||0),0);
  const desc=Math.min(100,Math.max(0,parseFloat(document.getElementById('pres-descuento').value)||0));
  const dv=sub*desc/100, total=sub-dv;
  document.getElementById('pres-subtotal').textContent=fmt(sub);
  document.getElementById('pres-desc-valor').textContent=fmt(dv);
  document.getElementById('pres-total').textContent=fmt(total);
}
function presGetDatos(){
  const cliente=document.getElementById('pres-cliente').value.trim()||'Cliente';
  const numero=document.getElementById('pres-numero').value.trim()||'---';
  const sub=presItems.reduce((s,i)=>s+(i.qty||0)*(i.precio||0),0);
  const desc=Math.min(100,Math.max(0,parseFloat(document.getElementById('pres-descuento').value)||0));
  const dv=sub*desc/100, total=sub-dv;
  return {cliente,numero,sub,desc,dv,total,fecha:fechaHoy()};
}

// ── PDF GENERATION con jsPDF ──
function presExportarPDF(){
  const btn = document.querySelector('.btn-purple');
  if(btn){ btn.classList.add('loading'); btn.textContent='⏳ Generando...'; }

  // Carga jsPDF dinámicamente si no está disponible
  function generarPDF(){
    const {cliente,numero,sub,desc,dv,total,fecha} = presGetDatos();
    const items = presItems.filter(i=>i.desc||i.precio>0);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

    const pageW = 210;
    const marginL = 18, marginR = 18;
    const contentW = pageW - marginL - marginR;
    let y = 18;

    // ── Encabezado ──
    doc.setFillColor(17, 17, 17);
    doc.rect(0, 0, pageW, 38, 'F');

    // Logo / nombre
    doc.setFont('helvetica','bold');
    doc.setFontSize(22);
    doc.setTextColor(245, 166, 35); // gold
    doc.text('Ferreteria', marginL, 18);
    const fw = doc.getTextWidth('Ferreteria');
    doc.setTextColor(240, 240, 244);
    doc.text(' Carnevale', marginL + fw, 18);

    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(123, 123, 142);
    doc.text('Rosario, Argentina', marginL, 25);

    // Meta derecha
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.setTextColor(240, 240, 244);
    doc.text(`Presupuesto N\u00B0 ${numero}`, pageW - marginR, 14, {align:'right'});
    doc.setFont('helvetica','normal');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 180, 190);
    doc.text(`Fecha: ${formatFechaLarga(fecha)}`, pageW - marginR, 20, {align:'right'});
    doc.text('Valido por 15 dias', pageW - marginR, 26, {align:'right'});

    y = 48;

    // ── Bloque cliente ──
    doc.setFillColor(30, 30, 36);
    doc.roundedRect(marginL, y, contentW, 18, 3, 3, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.setTextColor(240, 240, 244);
    doc.text(cliente, marginL + 6, y + 7);
    doc.setFont('helvetica','normal');
    doc.setFontSize(8.5);
    doc.setTextColor(123, 123, 142);
    doc.text('Estimado/a cliente', marginL + 6, y + 13);
    y += 26;

    // ── Tabla items ──
    // Cabecera tabla
    doc.setFillColor(17, 17, 17);
    doc.rect(marginL, y, contentW, 8, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 170);

    const cols = {
      n:    { x: marginL + 3,   w: 8,  align:'left'  },
      desc: { x: marginL + 12,  w: 78, align:'left'  },
      cant: { x: marginL + 96,  w: 18, align:'right' },
      pu:   { x: marginL + 122, w: 28, align:'right' },
      sub:  { x: marginL + 158, w: 16, align:'right' }
    };
    doc.text('#',       cols.n.x,    y + 5.5);
    doc.text('DESCRIPCION', cols.desc.x, y + 5.5);
    doc.text('CANT.',   cols.cant.x + cols.cant.w, y + 5.5, {align:'right'});
    doc.text('P.UNIT.', cols.pu.x + cols.pu.w,    y + 5.5, {align:'right'});
    doc.text('SUBTOTAL',cols.sub.x + cols.sub.w,  y + 5.5, {align:'right'});
    y += 8;

    // Filas — todas con fondo oscuro, dos tonos alternados
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    items.forEach((item, idx) => {
      const rowH = 9;
      const rowSub = (item.qty||0)*(item.precio||0);
      // Todas las filas con fondo, alternando tonos para que siempre haya contraste
      if(idx % 2 === 0){
        doc.setFillColor(22, 22, 27);   // tono A (más oscuro)
      } else {
        doc.setFillColor(30, 30, 38);   // tono B (un poco más claro)
      }
      doc.rect(marginL, y, contentW, rowH, 'F');

      doc.setTextColor(130, 130, 148); // # gris tenue
      doc.text(String(idx+1), cols.n.x, y + 6);

      doc.setTextColor(220, 220, 232); // descripción blanco suave
      const descTxt = (item.desc||'—').substring(0, 48);
      doc.text(descTxt, cols.desc.x, y + 6);

      doc.setTextColor(200, 200, 215); // cantidad y precio unitario
      doc.text(String(item.qty||1), cols.cant.x + cols.cant.w, y + 6, {align:'right'});
      doc.text(fmtPdf(item.precio||0), cols.pu.x + cols.pu.w, y + 6, {align:'right'});

      doc.setTextColor(167, 139, 250); // subtotal en morado
      doc.text(fmtPdf(rowSub), cols.sub.x + cols.sub.w, y + 6, {align:'right'});
      y += rowH;
    });

    // Línea separador
    doc.setDrawColor(46, 46, 56);
    doc.line(marginL, y + 2, marginL + contentW, y + 2);
    y += 8;

    // ── Totales ──
    const totW = 80;
    const totX = pageW - marginR - totW;

    function totalRow(label, value, highlight=false, gold=false){
      if(highlight){
        doc.setFillColor(30, 30, 36);
        doc.rect(totX - 4, y - 5, totW + 4, 10, 'F');
      }
      doc.setFont('helvetica', highlight ? 'bold' : 'normal');
      doc.setFontSize(highlight ? 11 : 9.5);
      doc.setTextColor(gold ? 245 : highlight ? 240 : 123, gold ? 166 : highlight ? 240 : 123, gold ? 35 : highlight ? 244 : 142);
      doc.text(label, totX, y);
      if(gold){
        doc.setTextColor(245,166,35);
      } else if(highlight){
        doc.setTextColor(240,240,244);
      } else {
        doc.setTextColor(240,240,244);
      }
      doc.text(fmtPdf(value), totX + totW, y, {align:'right'});
      y += highlight ? 12 : 8;
    }

    totalRow('Subtotal', sub);
    if(desc > 0) totalRow(`Descuento (${desc}%)`, -dv);

    // Línea antes del total
    doc.setDrawColor(46,46,56);
    doc.line(totX - 4, y - 3, totX + totW, y - 3);
    y += 2;

    // Total grande
    doc.setFillColor(20, 20, 26);
    doc.roundedRect(totX - 6, y - 6, totW + 10, 16, 3, 3, 'F');
    doc.setDrawColor(245,166,35);
    doc.setLineWidth(0.5);
    doc.roundedRect(totX - 6, y - 6, totW + 10, 16, 3, 3, 'S');
    doc.setLineWidth(0.2);

    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.setTextColor(123,123,142);
    doc.text('TOTAL', totX, y + 4);
    doc.setFontSize(14);
    doc.setTextColor(245,166,35);
    doc.text(fmtPdf(total), totX + totW, y + 4, {align:'right'});
    y += 22;

    // ── Footer ──
    const pageH = 297;
    doc.setFillColor(17,17,17);
    doc.rect(0, pageH - 16, pageW, 16, 'F');
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(80,80,90);
    doc.text('Presupuesto generado por AFM Solutions · afmsolutions.com.ar', pageW/2, pageH - 7, {align:'center'});

    // Guardar
    doc.save(`presupuesto-${numero}-${cliente.replace(/\s+/g,'-')}.pdf`);

    if(btn){ btn.classList.remove('loading'); btn.textContent='📄 PDF'; }
  }

  // Cargar jsPDF si no está disponible
  if(window.jspdf){
    generarPDF();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => generarPDF();
    script.onerror = () => {
      if(btn){ btn.classList.remove('loading'); btn.textContent='📄 PDF'; }
      alert('No se pudo cargar la librería de PDF. Verificá tu conexión a internet.');
    };
    document.head.appendChild(script);
  }
}

// Formato de número para PDF (sin símbolo $ para que jsPDF no se confunda con encoding)
function fmtPdf(n){
  return '$' + (n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function presCompartirWhatsApp(){
  const {cliente,numero,sub,desc,dv,total,fecha}=presGetDatos();
  const items=presItems.filter(i=>i.desc||i.precio>0);
  let msg=`*Presupuesto N\u00B0 ${numero} \u2014 Ferretería Carnevale*\nFecha: ${formatFechaLarga(fecha)}\nCliente: ${cliente}\n\n*Items:*\n`;
  items.forEach((i,idx)=>{ msg+=`${idx+1}. ${i.desc||'Producto'} x${i.qty||1} = ${fmt((i.qty||0)*(i.precio||0))}\n`; });
  msg+=`\nSubtotal: ${fmt(sub)}`;
  if(desc>0) msg+=`\nDescuento (${desc}%): -${fmt(dv)}`;
  msg+=`\n*TOTAL: ${fmt(total)}*\n\n_Válido por 15 días_`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

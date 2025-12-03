/* app.js - Painel local standalone (no Google)
   Stores data in IndexedDB, exports PDF/CSV, PWA-ready
*/

const DEFAULT_TOWERS = [
  "ER 01","ER 02","ER 03","ER 04","ER 05","ER 06","ER 07","ER 08","ER 09",
  "ER 10","ER 11","ER 12","ER 13","ER 14","ER 15","ER 16","ER 17","ER 18",
  "ER 19","ER 20","ER 21","ER 22","ER 23"
];

let towers = [];

async function init() {
  // register sw
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(()=>console.warn('SW fail'));
  }
  await openDB();
  // populate defaults if empty
  const all = await idbGetAll('towers');
  if (!all || all.length === 0) {
    const now = new Date().toISOString();
    for (const t of DEFAULT_TOWERS) {
      const obj = {
        Torre: t,
        Localização: 'COS',
        "Status Operacional": 'Operando',
        "Última Comunicação": now,
        "Falha Detectada": 'Nenhuma',
        "Ação Requerida": 'Nenhuma',
        "Prioridade": 'Média',
        "Técnico Responsável": 'A designar',
        "Data da Última Manutenção": '',
        "Custo da Última Manutenção (R$)": '',
        "Peças Utilizadas": '',
        "Próxima Manutenção": '',
        "Observações": '',
        "Pendência de Serviço": '',
        "Pendência de Material": '',
        "Link para Relatório": ''
      };
      await idbPut('towers', obj);
    }
  }
  towers = await idbGetAll('towers');
  render();
}

// render UI
function render() {
  const panel = document.getElementById('towers-panel');
  panel.innerHTML = '';
  const filter = document.getElementById('filterStatus').value;
  towers = towers.sort((a,b)=>a.Torre.localeCompare(b.Torre));
  towers.filter(t => filter==='all' || t['Status Operacional']===filter).forEach(t => {
    panel.appendChild(renderCard(t));
  });
}

// card
function renderCard(t) {
  const pendServ = t['Pendência de Serviço'] ? String(t['Pendência de Serviço']).trim() : '';
  const pendMat = t['Pendência de Material'] ? String(t['Pendência de Material']).trim() : '';
  const hasPending = pendServ!=='' || pendMat!=='';
  const card = document.createElement('div');
  card.className = 'tower-card' + (hasPending? ' alert-pending':'');
  let icon='🟢';
  if (t['Status Operacional']==='Falha') icon='🔴';
  if (t['Status Operacional']==='Offline') icon='🟠';
  if (hasPending) icon='🔔';
  card.innerHTML = `
    <div class="card-header">
      <div class="title-area"><h2>${icon} ${t.Torre}</h2></div>
      <div class="status-pill status-${t['Status Operacional']}">${t['Status Operacional']}</div>
    </div>
    ${hasPending?'<div class="pend-banner">⚠ Pendências encontradas — verifique!</div>':''}
    <div class="section-box">
      <div class="section-title">Informações Gerais</div>
      <div class="row"><strong>Localização:</strong> ${t.Localização||'—'}</div>
      <div class="row"><strong>Prioridade:</strong> ${t.Prioridade||'—'}</div>
      <div class="row"><strong>Técnico:</strong> ${t['Técnico Responsável']||'—'}</div>
      <div class="row"><strong>Última Comunicação:</strong> ${t['Última Comunicação']||'—'}</div>
    </div>
    <div class="section-box">
      <div class="section-title">Falhas e Ações</div>
      <div class="row"><strong>Falha Detectada:</strong> ${t['Falha Detectada']||'—'}</div>
      <div class="row"><strong>Histórico de Falha:</strong> ${t['Histórico de Falha']||'—'}</div>
      <div class="row"><strong>Ação Requerida:</strong> ${t['Ação Requerida']||'—'}</div>
    </div>
    <div class="section-box">
      <div class="section-title">Manutenção</div>
      <div class="row"><strong>Última Manutenção:</strong> ${t['Data da Última Manutenção']||'—'}</div>
      <div class="row"><strong>Custo:</strong> ${t['Custo da Última Manutenção (R$)']||'—'}</div>
      <div class="row"><strong>Peças Utilizadas:</strong> ${t['Peças Utilizadas']||'—'}</div>
      <div class="row"><strong>Próxima Manutenção:</strong> ${t['Próxima Manutenção']||'—'}</div>
    </div>
    <div class="section-box">
      <div class="section-title">Pendências</div>
      <div class="row"><strong>Pend. Serviço:</strong> ${pendServ||'—'}</div>
      <div class="row"><strong>Pend. Material:</strong> ${pendMat||'—'}</div>
    </div>
    <div class="section-box">
      <div class="section-title">Observações</div>
      <div class="row"><strong>Obs:</strong> ${t['Observações']||'—'}</div>
    </div>
    <div style="display:flex; gap:8px; margin-top:12px;">
      <button class="edit-btn" onclick="openEdit('${t.Torre.replace(/'/g,"\\'")}')">✏️ Editar</button>
      <button class="btn" onclick="downloadReport('${t.Torre.replace(/'/g,"\\'")}')">📄 Relatório</button>
    </div>
  `;
  return card;
}

// open edit modal
function openEdit(torre) {
  const t = towers.find(x=>x.Torre===torre);
  if(!t) return alert('Torre não encontrada');
  document.getElementById('editName').innerText = torre;
  document.getElementById('editTorre').value = t.Torre;
  document.getElementById('editLocalizacao').value = t.Localização||'';
  document.getElementById('editStatus').value = t['Status Operacional']||'';
  document.getElementById('editFalha').value = t['Falha Detectada']||'';
  document.getElementById('editHistorico').value = t['Histórico de Falha']||'';
  document.getElementById('editAcao').value = t['Ação Requerida']||'';
  document.getElementById('editTecnico').value = t['Técnico Responsável']||'';
  document.getElementById('editDataManutencao').value = t['Data da Última Manutenção']||'';
  document.getElementById('editCusto').value = t['Custo da Última Manutenção (R$)']||'';
  document.getElementById('editPecas').value = t['Peças Utilizadas']||'';
  document.getElementById('editProxManutencao').value = t['Próxima Manutenção']||'';
  document.getElementById('editPendServico').value = t['Pendência de Serviço']||'';
  document.getElementById('editPendMaterial').value = t['Pendência de Material']||'';
  document.getElementById('editObs').value = t['Observações']||'';
  document.getElementById('editModal').classList.add('show');
}

// save edit
async function saveEdit() {
  const torre = document.getElementById('editTorre').value;
  const t = towers.find(x=>x.Torre===torre);
  if(!t) return;
  t.Localização = document.getElementById('editLocalizacao').value;
  t['Status Operacional'] = document.getElementById('editStatus').value;
  t['Falha Detectada'] = document.getElementById('editFalha').value;
  t['Histórico de Falha'] = document.getElementById('editHistorico').value;
  t['Ação Requerida'] = document.getElementById('editAcao').value;
  t['Técnico Responsável'] = document.getElementById('editTecnico').value;
  t['Data da Última Manutenção'] = document.getElementById('editDataManutencao').value;
  t['Custo da Última Manutenção (R$)'] = document.getElementById('editCusto').value;
  t['Peças Utilizadas'] = document.getElementById('editPecas').value;
  t['Próxima Manutenção'] = document.getElementById('editProxManutencao').value;
  t['Pendência de Serviço'] = document.getElementById('editPendServico').value;
  t['Pendência de Material'] = document.getElementById('editPendMaterial').value;
  t['Observações'] = document.getElementById('editObs').value;
  t['Última Comunicação'] = new Date().toISOString();
  await idbPut('towers', t);
  towers = await idbGetAll('towers');
  document.getElementById('editModal').classList.remove('show');
  render();
}

// download report (PDF using jsPDF)
function downloadReport(torre) {
  const t = towers.find(x=>x.Torre===torre);
  if(!t) return alert('Torre não encontrada');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Relatório - ' + t.Torre, 14, 20);
  doc.setFontSize(11);
  let y = 30;
  for(const key of ['Localização','Status Operacional','Última Comunicação','Falha Detectada','Ação Requerida','Prioridade','Técnico Responsável','Data da Última Manutenção','Custo da Última Manutenção (R$)','Peças Utilizadas','Próxima Manutenção','Pendência de Serviço','Pendência de Material','Observações']) {
    doc.text(key + ': ' + (t[key]||''), 14, y);
    y += 7;
    if (y > 280) { doc.addPage(); y = 20; }
  }
  doc.save('Relatorio_' + t.Torre.replace(/\s+/g,'_') + '.pdf');
}

// export all to CSV
async function exportCSV() {
  const rows = towers;
  const keys = ['Torre','Localização','Status Operacional','Última Comunicação','Falha Detectada','Ação Requerida','Prioridade','Técnico Responsável','Data da Última Manutenção','Custo da Última Manutenção (R$)','Peças Utilizadas','Próxima Manutenção','Pendência de Serviço','Pendência de Material','Observações'];
  let csv = keys.join(',') + '\n';
  for(const r of rows) {
    const line = keys.map(k => '"' + (r[k] ? String(r[k]).replace(/"/g,'""') : '') + '"').join(',');
    csv += line + '\n';
  }
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'torres.csv'; document.body.appendChild(a); a.click(); a.remove();
}

// init bindings
window.addEventListener('load', async ()=>{ 
  await init();
  document.getElementById('btnRefresh').onclick = async ()=>{ towers = await idbGetAll('towers'); render(); };
  document.getElementById('filterStatus').onchange = render;
  document.getElementById('saveEdit').onclick = saveEdit;
  document.getElementById('cancelEdit').onclick = ()=> document.getElementById('editModal').classList.remove('show');
  document.getElementById('btnExportCSV').onclick = exportCSV;
});

// utility to download full table as PDF (landscape)
async function exportAllPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l','pt','a4');
  doc.setFontSize(14);
  let y = 40;
  doc.text('Relatório Completo - Torres', 40, y); y += 20;
  const keys = ['Torre','Localização','Status Operacional','Última Comunicação','Falha Detectada','Ação Requerida','Prioridade','Técnico Responsável'];
  doc.setFontSize(10);
  for(const t of towers) {
    let x = 40;
    for(const k of keys) {
      doc.text(String(t[k]||''), x, y);
      x += 120;
    }
    y += 18;
    if (y > 540) { doc.addPage(); y = 40; }
  }
  doc.save('Relatorio_Todas_Torres.pdf');
}

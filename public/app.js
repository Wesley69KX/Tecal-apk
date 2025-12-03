/* app.js - main pwa logic */
(async()=>{
  // constants
  const API_PUSH = '/api/towers'; // server endpoint (Vercel function)
  const DEFAULT_TOWERS = [
    "ER 01","ER 02","ER 03","ER 04","ER 05","ER 06","ER 07","ER 08","ER 09",
    "ER 10","ER 11","ER 12","ER 13","ER 14","ER 15","ER 16","ER 17","ER 18",
    "ER 19","ER 20","ER 21","ER 22","ER 23"
  ];

  // DOM refs
  const panel = document.getElementById('towers-panel');
  const filterStatus = document.getElementById('filterStatus');
  const searchInput = document.getElementById('searchInput');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnSync = document.getElementById('btnSync');
  const addBtn = document.getElementById('addBtn');
  const offlineBanner = document.getElementById('offlineBanner');

  // modal elements
  const editModal = document.getElementById('editModal');
  const editTorre = document.getElementById('editTorre');
  const editLocalizacao = document.getElementById('editLocalizacao');
  const editStatus = document.getElementById('editStatus');
  const editFalha = document.getElementById('editFalha');
  const editAcao = document.getElementById('editAcao');
  const editTecnico = document.getElementById('editTecnico');
  const editDataManutencao = document.getElementById('editDataManutencao');
  const editCusto = document.getElementById('editCusto');
  const editPecas = document.getElementById('editPecas');
  const editProxManutencao = document.getElementById('editProxManutencao');
  const editPendServico = document.getElementById('editPendServico');
  const editPendMaterial = document.getElementById('editPendMaterial');
  const editObs = document.getElementById('editObs');
  const saveEdit = document.getElementById('saveEdit');
  const cancelEdit = document.getElementById('cancelEdit');
  const reportBtn = document.getElementById('reportBtn');

  let towers = [];
  let currentEdit = null;

  // initialize DB + default data
  await openDB();
  let all = await idbGetAll('towers');
  if (!all || all.length === 0) {
    const now = new Date().toISOString();
    for (const t of DEFAULT_TOWERS) {
      await idbPut('towers', {
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
      });
    }
    all = await idbGetAll('towers');
  }
  towers = all;
  render();

  // events
  filterStatus.addEventListener('change', render);
  searchInput?.addEventListener('input', render);
  btnRefresh.addEventListener('click', async ()=>{ towers = await idbGetAll('towers'); render(); });
  addBtn.addEventListener('click', ()=> openCreate());
  btnSync.addEventListener('click', syncNow);
  window.addEventListener('online', ()=>{ offlineBanner.classList.add('hidden'); syncNow(); });
  window.addEventListener('offline', ()=>{ offlineBanner.classList.remove('hidden'); });

  cancelEdit.addEventListener('click', ()=>closeModal());
  saveEdit.addEventListener('click', async ()=>{
    await saveEditHandler();
  });
  reportBtn.addEventListener('click', ()=> {
    if (currentEdit) downloadReport(currentEdit);
  });

  // render
  function render() {
    panel.innerHTML = '';
    const q = searchInput?.value?.toLowerCase?.() || '';
    const filter = filterStatus.value || 'all';

    towers = towers.sort((a,b)=> (a.Torre||'').localeCompare(b.Torre||''));
    towers.filter(t=>{
      if (filter !== 'all' && t['Status Operacional'] !== filter) return false;
      if (q && !(t.Torre||'').toLowerCase().includes(q) && !(t.Localização||'').toLowerCase().includes(q)) return false;
      return true;
    }).forEach(t=>{
      panel.appendChild(cardFor(t));
    });
  }

  function cardFor(t){
    const pendServ = t['Pendência de Serviço'] || '';
    const pendMat = t['Pendência de Material'] || '';
    const hasPending = (pendServ.trim() !== '' || pendMat.trim() !== '');
    const card = document.createElement('div');
    card.className = 'tower-card';
    card.innerHTML = `
      <div class="card-header">
        <h3> ${t.Torre} </h3>
        <div class="status-pill status-${t['Status Operacional']}">${t['Status Operacional']}</div>
      </div>
      ${hasPending?`<div class="pend-banner">⚠ Pendências encontradas — verifique!</div>`:''}
      <div class="section">
        <div class="row"><strong>Localização</strong><span>${t.Localização||'—'}</span></div>
        <div class="row"><strong>Última Comunicação</strong><span>${t['Última Comunicação']? formatDate(t['Última Comunicação']) : '—'}</span></div>
        <div class="row"><strong>Técnico</strong><span>${t['Técnico Responsável']||'—'}</span></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn" data-action="edit">✏️ Editar</button>
        <button class="btn" data-action="report">📄 Relatório</button>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener('click', ()=> openEdit(t.Torre));
    card.querySelector('[data-action="report"]').addEventListener('click', ()=> downloadReport(t.Torre));
    return card;
  }

  // open edit modal by torre
  function openEdit(torre){
    const t = towers.find(x=>x.Torre===torre);
    if(!t) return alert('Torre não encontrada');
    currentEdit = torre;
    editTorre.value = t.Torre || '';
    editLocalizacao.value = t.Localização || '';
    editStatus.value = t['Status Operacional'] || 'Operando';
    editFalha.value = t['Falha Detectada'] || '';
    editAcao.value = t['Ação Requerida'] || '';
    editTecnico.value = t['Técnico Responsável'] || '';
    editDataManutencao.value = t['Data da Última Manutenção'] || '';
    editCusto.value = t['Custo da Última Manutenção (R$)'] || '';
    editPecas.value = t['Peças Utilizadas'] || '';
    editProxManutencao.value = t['Próxima Manutenção'] || '';
    editPendServico.value = t['Pendência de Serviço'] || '';
    editPendMaterial.value = t['Pendência de Material'] || '';
    editObs.value = t['Observações'] || '';
    editModal.classList.add('show');
  }

  function openCreate(){
    // create new tower name dialog (simple)
    const name = prompt('Nome da nova torre (ex: ER 24)');
    if(!name) return;
    const now = new Date().toISOString();
    const obj = {
      Torre: name,
      Localização: 'COS',
      "Status Operacional": 'Operando',
      "Última Comunicação": now,
      "Falha Detectada": '',
      "Ação Requerida": '',
      "Prioridade": 'Média',
      "Técnico Responsável": '',
      "Data da Última Manutenção": '',
      "Custo da Última Manutenção (R$)": '',
      "Peças Utilizadas": '',
      "Próxima Manutenção": '',
      "Observações": '',
      "Pendência de Serviço": '',
      "Pendência de Material": ''
    };
    idbPut('towers', obj).then(async ()=>{
      towers = await idbGetAll('towers');
      render();
      queueOutbox({ type: 'create', data: obj });
    });
  }

  async function saveEditHandler(){
    if(!currentEdit) return;
    // read data
    const t = await idbGet('towers', currentEdit);
    if(!t) return;
    t.Localização = editLocalizacao.value;
    t['Status Operacional'] = editStatus.value;
    t['Falha Detectada'] = editFalha.value;
    t['Ação Requerida'] = editAcao.value;
    t['Técnico Responsável'] = editTecnico.value;
    t['Data da Última Manutenção'] = editDataManutencao.value;
    t['Custo da Última Manutenção (R$)'] = editCusto.value;
    t['Peças Utilizadas'] = editPecas.value;
    t['Próxima Manutenção'] = editProxManutencao.value;
    t['Pendência de Serviço'] = editPendServico.value;
    t['Pendência de Material'] = editPendMaterial.value;
    t['Observações'] = editObs.value;
    t['Última Comunicação'] = new Date().toISOString();

    await idbPut('towers', t);
    towers = await idbGetAll('towers');
    render();
    closeModal();

    // push to outbox for sync
    await queueOutbox({ type: 'update', Torre: t.Torre, updates: t });
  }

  function closeModal(){
    editModal.classList.remove('show');
    currentEdit = null;
  }

  // outbox queue
  async function queueOutbox(item){
    await idbPut('outbox', { ...item, time: Date.now() });
    // try sync immediately
    if(navigator.onLine) await processOutbox();
  }

  async function processOutbox(){
    const items = await idbGetAll('outbox');
    for(const it of items){
      try{
        await fetch(API_PUSH, {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(it)
        });
        // delete after success
        await idbDelete('outbox', it.id);
      }catch(e){
        console.warn('outbox sync failed', e);
      }
    }
  }

  // sync full dataset with server (pull + push)
  async function syncNow(){
    try{
      // push local outbox first
      await processOutbox();

      // pull from server
      const r = await fetch(API_PUSH);
      if(r.ok){
        const remote = await r.json();
        // remote expected array of towers
        if(Array.isArray(remote)){
          // merge remote into local (overwrite)
          for(const t of remote){
            await idbPut('towers', t);
          }
          towers = await idbGetAll('towers');
          render();
          alert('Sincronização concluída');
        } else if(remote.ok){
          // legacy response
          alert('Sincronização concluída');
        }
      }
    }catch(e){
      console.warn('sync failed', e);
      alert('Não foi possível sincronizar — usando dados locais');
    }
  }

  // export per-tower PDF
  function downloadReport(torre){
    const t = towers.find(x=>x.Torre === torre);
    if(!t) return alert('Torre não encontrada');
    const { jsPDF } = window.jspdf || window.jspdf || {};
    if(!jsPDF){
      // fallback: create simple text file
      const txt = Object.keys(t).map(k=>k+': '+(t[k]||'')).join('\\n');
      const blob = new Blob([txt], {type:'text/plain'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Relatorio_${torre.replace(/\\s+/g,'_')}.txt`;
      a.click();
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório - ' + t.Torre, 14, 20);
    doc.setFontSize(11);
    let y = 30;
    for(const key of ['Localização','Status Operacional','Última Comunicação','Falha Detectada','Ação Requerida','Prioridade','Técnico Responsável','Data da Última Manutenção','Custo da Última Manutenção (R$)','Peças Utilizadas','Próxima Manutenção','Pendência de Serviço','Pendência de Material','Observações']){
      doc.text(`${key}: ${t[key] || ''}`, 14, y);
      y += 7;
      if(y > 280){ doc.addPage(); y = 20; }
    }
    doc.save(`Relatorio_${torre.replace(/\\s+/g,'_')}.pdf`);
  }

  // helpers
  function formatDate(s){
    try{
      const d = new Date(s);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    }catch(e){ return s; }
  }

  // try background sync when becomes online
  if(navigator.onLine) processOutbox();

})();

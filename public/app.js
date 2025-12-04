const app = {
    towers: [],
    tempPhotos: [],
    db: null, 

    // =================================================================
    // 1. COLE SUA LOGO AQUI (Obrigatório para não dar erro no PDF)
    // =================================================================
    logoEmpresa: "", 

    // =================================================================
    // 2. SUAS CHAVES DO FIREBASE (JÁ CONFIGUREI PARA VOCÊ)
    // =================================================================
    firebaseConfig: {
        apiKey: "AIzaSyAbWgRpYBguSf5J9xYG7EwH6tx0xxBEvV4",
        authDomain: "gestao-torres.firebaseapp.com",
        projectId: "gestao-torres",
        storageBucket: "gestao-torres.firebasestorage.app",
        messagingSenderId: "580007649384",
        appId: "1:580007649384:web:568bd6c711bb9e0df35bdd",
        measurementId: "G-P6N25K7R4X"
    },

    // --- INICIALIZAÇÃO ---
    async init() {
        try {
            if (!firebase.apps.length) firebase.initializeApp(this.firebaseConfig);
            this.db = firebase.firestore();
            await idb.open();

            // Listener Firebase
            this.db.collection('towers').onSnapshot((snapshot) => {
                const loading = document.getElementById('loading-msg');
                if(loading) loading.style.display = 'none';

                if (!snapshot.empty) {
                    const cloudData = [];
                    snapshot.forEach(doc => cloudData.push(doc.data()));
                    this.towers = cloudData;
                    this.updateLocalBackup(cloudData);
                    this.renderList();
                } else {
                    this.checkDataIntegrity();
                }
            }, (error) => {
                console.log("Offline mode.");
                const loading = document.getElementById('loading-msg');
                if(loading) loading.style.display = 'none';
                this.loadFromLocal();
            });
        } catch (e) {
            console.error("Erro init:", e);
            this.loadFromLocal();
        }

        this.updateOnlineStatus();
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
    },

    async checkDataIntegrity() {
        const localData = await idb.getAll('towers');
        if (localData.length > 0) {
            this.towers = localData;
            if(navigator.onLine) this.syncNow();
        } else {
            await this.seedDatabase(); 
        }
        this.renderList();
    },

    async loadFromLocal() {
        this.towers = await idb.getAll('towers');
        if(this.towers.length === 0) await this.seedDatabase();
        this.renderList();
    },

    async updateLocalBackup(data) {
        await idb.clear('towers');
        for (const t of data) await idb.put('towers', t);
    },

    async seedDatabase() {
        const nowStr = new Date().toISOString();
        const batch = this.db ? this.db.batch() : null;

        for (let i = 1; i <= 25; i++) {
            const idStr = i.toString().padStart(2, '0');
            const tower = {
                id: i,
                nome: `ER ${idStr}`,
                status: "Operando",
                geral: { localizacao: "", prioridade: "Média", tecnico: "", ultimaCom: "" },
                falhas: { detectada: "", historico: "", acao: "" },
                manutencao: { ultima: "", custo: "", pecas: "", proxima: "" },
                pendencias: { servico: "", material: "" },
                observacoes: "", fotos: [], updatedAt: nowStr
            };
            await idb.put('towers', tower);
            if(batch) {
                const docRef = this.db.collection('towers').doc(String(i));
                batch.set(docRef, tower);
            }
        }
        if(batch) await batch.commit();
        this.towers = await idb.getAll('towers');
        this.renderList();
    },

    async saveTower(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('tower-id').value);
        const existing = this.towers.find(x => x.id === id) || {};

        const tower = {
            id: id,
            nome: document.getElementById('f-nome').value,
            status: document.getElementById('f-status').value,
            geral: {
                localizacao: document.getElementById('f-geral-local').value,
                prioridade: document.getElementById('f-geral-prio').value,
                tecnico: document.getElementById('f-geral-tec').value,
                ultimaCom: document.getElementById('f-geral-ultimacom').value
            },
            falhas: {
                detectada: document.getElementById('f-falhas-detectada').value,
                historico: document.getElementById('f-falhas-historico').value,
                acao: document.getElementById('f-falhas-acao').value
            },
            manutencao: {
                ultima: document.getElementById('f-manu-ultima').value,
                proxima: document.getElementById('f-manu-proxima').value,
                custo: document.getElementById('f-manu-custo').value,
                pecas: document.getElementById('f-manu-pecas').value
            },
            pendencias: {
                servico: document.getElementById('f-pend-servico').value,
                material: document.getElementById('f-pend-material').value
            },
            observacoes: document.getElementById('f-obs').value,
            fotos: this.tempPhotos.length > 0 ? this.tempPhotos : (existing.fotos || []),
            updatedAt: new Date().toISOString()
        };

        await idb.put('towers', tower);
        if (navigator.onLine && this.db) {
            try { await this.db.collection('towers').doc(String(id)).set(tower); alert("Salvo na Nuvem!"); }
            catch (error) { alert("Salvo Offline."); }
        } else { alert("Salvo Offline."); }
        this.closeModal();
    },

    // --- RENDERIZAÇÃO COMPLETA NO CARD ---
    renderList(list = this.towers) {
        const container = document.getElementById('tower-list');
        container.innerHTML = '';
        if(!list || list.length === 0) return;

        list.sort((a, b) => a.id - b.id);

        list.forEach(t => {
            const div = document.createElement('div');
            div.className = `card st-${t.status.replace(' ','')}`;
            
            // Verifica pendências para o alerta
            const hasAlert = (t.pendencias.material && t.pendencias.material.length > 1) || 
                             (t.pendencias.servico && t.pendencias.servico.length > 1) || 
                             (t.falhas.detectada && t.falhas.detectada.length > 1) ||
                             t.status === "Falha";
            
            const alertHTML = hasAlert ? `<div class="warning-alert">Pendências encontradas — verifique!</div>` : '';

            // Formatação de datas e valores nulos
            const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
            const fmtDateTime = (d) => d ? new Date(d).toLocaleString('pt-BR') : '-';
            const val = (v) => (v && v.length > 0) ? v : '-';

            // HTML DO CARD COMPLETO
            div.innerHTML = `
                <div class="card-header">
                    <strong>🔔 ${t.nome}</strong>
                    <span class="status-pill">${t.status}</span>
                </div>
                
                ${alertHTML}
                
                <div class="card-body">
                    <div class="data-section">
                        <div class="section-title">Informações Gerais</div>
                        <div class="info-row"><span class="info-label">Local:</span> <span class="info-value">${val(t.geral.localizacao)}</span></div>
                        <div class="info-row"><span class="info-label">Prioridade:</span> <span class="info-value">${val(t.geral.prioridade)}</span></div>
                        <div class="info-row"><span class="info-label">Técnico:</span> <span class="info-value">${val(t.geral.tecnico)}</span></div>
                        <div class="info-row"><span class="info-label">Comunicação:</span> <span class="info-value">${fmtDateTime(t.geral.ultimaCom)}</span></div>
                    </div>

                    <div class="data-section">
                        <div class="section-title">Falhas e Ações</div>
                        <div class="info-row ${t.falhas.detectada ? 'text-red' : ''}"><span class="info-label">Detectada:</span> <span class="info-value">${val(t.falhas.detectada)}</span></div>
                        <div class="info-row"><span class="info-label">Histórico:</span> <span class="info-value">${val(t.falhas.historico)}</span></div>
                        <div class="info-row"><span class="info-label">Ação:</span> <span class="info-value">${val(t.falhas.acao)}</span></div>
                    </div>

                    <div class="data-section">
                        <div class="section-title">Manutenção</div>
                        <div class="info-row"><span class="info-label">Última:</span> <span class="info-value">${fmtDate(t.manutencao.ultima)}</span></div>
                        <div class="info-row"><span class="info-label">Próxima:</span> <span class="info-value">${fmtDate(t.manutencao.proxima)}</span></div>
                        <div class="info-row"><span class="info-label">Custo:</span> <span class="info-value">${val(t.manutencao.custo)}</span></div>
                        <div class="info-row"><span class="info-label">Peças:</span> <span class="info-value">${val(t.manutencao.pecas)}</span></div>
                    </div>

                    <div class="data-section">
                        <div class="section-title">Pendências</div>
                        <div class="info-row ${t.pendencias.servico ? 'text-red' : ''}"><span class="info-label">Serviço:</span> <span class="info-value">${val(t.pendencias.servico)}</span></div>
                        <div class="info-row ${t.pendencias.material ? 'text-red' : ''}"><span class="info-label">Material:</span> <span class="info-value">${val(t.pendencias.material)}</span></div>
                    </div>

                    ${t.observacoes ? `<div class="obs-box">" ${t.observacoes} "</div>` : ''}
                    ${t.fotos.length > 0 ? `<div style="margin-top:10px; font-weight:bold; color:#0056b3">📷 ${t.fotos.length} fotos anexadas</div>` : ''}
                </div>

                <div class="card-footer">
                    <button class="btn-card btn-pdf-single" onclick="app.generatePDF(${t.id})">📄 PDF</button>
                    <button class="btn-card btn-edit" onclick="app.editTower(${t.id})">✏️ Editar</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    // --- PDF FUNCTIONS ---
    generateMonthlyPDF() {
        const input = prompt("Mês/Ano (ex: 12/2025):");
        if (!input) return;
        const [mes, ano] = input.split('/');
        if (!mes || !ano) return alert("Erro no formato.");

        const filtered = this.towers.filter(t => {
            if (!t.manutencao.ultima) return false;
            const d = new Date(t.manutencao.ultima); d.setHours(12);
            return (d.getMonth() + 1) == parseInt(mes) && d.getFullYear() == parseInt(ano);
        });

        if (filtered.length === 0) return alert("Sem registros para este mês.");

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        if (this.logoEmpresa.length > 100) try { doc.addImage(this.logoEmpresa, 'PNG', 75, 20, 60, 30); } catch (e) {}
        doc.setFont("times", "bold"); doc.setFontSize(18);
        doc.text("RELATÓRIO MENSAL", 105, 80, null, null, "center");
        doc.text(`Período: ${input}`, 105, 100, null, null, "center");
        
        filtered.forEach((t, i) => {
            doc.addPage();
            this.drawTowerPage(doc, t, i + 1, filtered.length);
        });
        doc.save(`Relatorio_Mensal_${mes}_${ano}.pdf`);
    },

    generateGlobalPDF() {
        if(!confirm("Gerar relatório completo?")) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        if (this.logoEmpresa.length > 100) try { doc.addImage(this.logoEmpresa, 'PNG', 75, 30, 60, 30); } catch (e) {}

        doc.setFont("times", "bold"); doc.setFontSize(18);
        let y = 90;
        doc.text("SERVIÇOS DE MANUTENÇÃO DO", 105, y, null, null, "center"); y+=10;
        doc.text("SISTEMA DE NOTIFICAÇÃO EM", 105, y, null, null, "center"); y+=10;
        doc.text("MASSA", 105, y, null, null, "center"); y+=30;
        doc.setFontSize(16);
        doc.text("MINERAÇÃO ANGLOGOLD ASHANTI", 105, y, null, null, "center"); y+=10;
        doc.text("– CDS – SANTA BÁRBARA – MG", 105, y, null, null, "center");
        
        doc.setFontSize(12); doc.setFont("times", "normal");
        const hoje = new Date();
        const mes = hoje.toLocaleString('pt-BR', { month: 'long' });
        doc.text(`${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${hoje.getFullYear()}`, 105, 260, null, null, "center");

        const lista = [...this.towers].sort((a,b) => a.id - b.id);
        lista.forEach((t, i) => {
            doc.addPage();
            this.drawTowerPage(doc, t, i + 1, lista.length);
        });
        doc.save(`Relatorio_Geral_${new Date().toISOString().slice(0,10)}.pdf`);
    },

    drawTowerPage(doc, t, pageNumber, totalPages) {
        doc.setFont("times", "roman");
        if (this.logoEmpresa.length > 100) try { doc.addImage(this.logoEmpresa, 'PNG', 14, 10, 30, 15); } catch (e) {}
        else doc.setFontSize(10), doc.text("TECAL", 14, 20);
        
        doc.setFontSize(10); doc.setTextColor(80);
        doc.text(`Relatório: ${t.nome}`, 196, 15, null, null, "right");
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 196, 20, null, null, "right");
        doc.setDrawColor(0); doc.line(14, 28, 196, 28);

        let y = 40; 
        doc.setFontSize(16); doc.setTextColor(0); doc.setFont("times", "bold");
        doc.text(`Detalhes: ${t.nome}`, 105, y, null, null, "center"); y += 15;

        const drawSection = (title, obj) => {
            doc.setFontSize(13); doc.setFont("times", "bold"); doc.text(title, 14, y);
            y += 2; doc.line(14, y, 196, y); y += 6;
            doc.setFontSize(11); doc.setFont("times", "normal");
            Object.entries(obj).forEach(([k, v]) => {
                let val = (v && v!=='-') ? v : '---';
                if(k.includes('ultima') || k.includes('proxima')) {
                    try { if(v.includes('-')) val = new Date(v).toLocaleDateString('pt-BR'); } catch(e){}
                }
                doc.setFont("times", "bold"); doc.text(`${k.charAt(0).toUpperCase()+k.slice(1)}:`, 14, y);
                doc.setFont("times", "normal"); 
                doc.text(doc.splitTextToSize(val, 130), 60, y);
                y += 7;
            });
            y += 5;
        };

        drawSection("Geral", t.geral);
        drawSection("Falhas", t.falhas);
        drawSection("Manutenção", t.manutencao);
        drawSection("Pendências", t.pendencias);
        
        if(t.observacoes) {
            doc.setFont("times", "bold"); doc.text("Observações", 14, y); y+=6;
            doc.setFont("times", "italic");
            doc.text(doc.splitTextToSize(t.observacoes, 180), 14, y);
        }
        
        if(t.fotos.length > 0) {
            doc.addPage(); y=30;
            if (this.logoEmpresa.length > 100) try { doc.addImage(this.logoEmpresa, 'PNG', 14, 10, 20, 10); } catch (e) {}
            doc.setFont("times", "bold"); doc.text("Registro Fotográfico", 105, y, null, null, "center"); y+=15;
            
            t.fotos.forEach((f, i) => {
                if(y>200) { doc.addPage(); y=30; }
                try { 
                    doc.addImage(f, 'JPEG', 35, y, 140, 100); 
                    doc.setLineWidth(0.1); doc.rect(35, y, 140, 100);
                    y+=105; 
                    doc.setFontSize(10); doc.setFont("times", "italic");
                    doc.text(`Foto ${i+1}: Registro visual ${t.nome}`, 105, y, null, null, "center");
                    y+=20;
                } catch(e){}
            });
        }
        
        if(pageNumber) {
            doc.setFontSize(9); doc.setFont("times", "normal");
            doc.text(`Página ${pageNumber} de ${totalPages}`, 105, 290, null, null, "center");
        }
    },

    filterList() {
        const term = document.getElementById('search').value.toLowerCase();
        const f = this.towers.filter(t => t.nome.toLowerCase().includes(term));
        this.renderList(f);
    },
    closeModal() { document.getElementById('modal').style.display = 'none'; this.tempPhotos = []; },
    editTower(id) {
        const t = this.towers.find(x => x.id == id);
        if(!t) return;
        this.tempPhotos = [...t.fotos] || [];
        document.getElementById('tower-form').reset();
        document.getElementById('image-preview-container').innerHTML = '';
        
        document.getElementById('tower-id').value = t.id;
        document.getElementById('f-nome').value = t.nome;
        document.getElementById('f-status').value = t.status;
        document.getElementById('f-geral-local').value = t.geral.localizacao;
        document.getElementById('f-geral-prio').value = t.geral.prioridade;
        document.getElementById('f-geral-tec').value = t.geral.tecnico;
        document.getElementById('f-geral-ultimacom').value = t.geral.ultimaCom;
        document.getElementById('f-falhas-detectada').value = t.falhas.detectada;
        document.getElementById('f-falhas-historico').value = t.falhas.historico;
        document.getElementById('f-falhas-acao').value = t.falhas.acao;
        document.getElementById('f-manu-ultima').value = t.manutencao.ultima;
        document.getElementById('f-manu-proxima').value = t.manutencao.proxima;
        document.getElementById('f-manu-custo').value = t.manutencao.custo;
        document.getElementById('f-manu-pecas').value = t.manutencao.pecas;
        document.getElementById('f-pend-servico').value = t.pendencias.servico;
        document.getElementById('f-pend-material').value = t.pendencias.material;
        document.getElementById('f-obs').value = t.observacoes;
        
        this.renderImagePreviews();
        document.getElementById('modal').style.display = 'block';
    },
    handleImagePreview(e) {
        Array.from(e.target.files).forEach(file => {
             this.resizeImage(file, 800, 800, (b64) => {
                 if(this.tempPhotos.length < 3) {
                    this.tempPhotos.push(b64);
                    this.renderImagePreviews();
                 }
             });
        });
    },
    resizeImage(file, w, h, cb) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let ratio = Math.min(w / img.width, h / img.height);
                canvas.width = img.width * ratio; canvas.height = img.height * ratio;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                cb(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    },
    renderImagePreviews() {
        const c = document.getElementById('image-preview-container');
        c.innerHTML = '';
        this.tempPhotos.forEach((src, i) => {
            const d = document.createElement('div');
            d.innerHTML = `<img src="${src}" class="img-preview" onclick="app.removePhoto(${i})">`;
            c.appendChild(d);
        });
    },
    removePhoto(i) { this.tempPhotos.splice(i, 1); this.renderImagePreviews(); },
    
    updateOnlineStatus() {
        const el = document.getElementById('connection-status');
        el.innerText = navigator.onLine ? "Online" : "Offline";
        el.className = navigator.onLine ? "status-badge online" : "status-badge offline";
    },
    syncNow() {
        if(navigator.onLine && this.db) {
            this.towers.forEach(t => this.db.collection('towers').doc(String(t.id)).set(t));
            alert("Sincronizando...");
        } else {
            alert("Sem internet.");
        }
    }
};

window.onload = () => app.init();

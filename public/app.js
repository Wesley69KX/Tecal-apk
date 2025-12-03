const app = {
    towers: [],
    tempPhotos: [],

    async init() {
        await idb.open();
        this.towers = await idb.getAll('towers');
        
        // Se vazio, cria as 25 torres
        if (this.towers.length === 0) {
            await this.seedDatabase();
            this.towers = await idb.getAll('towers');
        }

        this.renderList();
        this.updateOnlineStatus();

        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js').catch(console.error);
        }
        if (navigator.onLine) this.syncNow();
    },

    async seedDatabase() {
        const nowStr = new Date().toISOString().slice(0, 16);
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 1; i <= 25; i++) {
            const idStr = i.toString().padStart(2, '0');
            const tower = {
                id: i,
                nome: `ER ${idStr}`,
                status: i % 8 === 0 ? "Falha" : "Operando",
                geral: {
                    localizacao: `CDS - Setor ${String.fromCharCode(65 + (i%5))}`,
                    prioridade: "Média",
                    tecnico: "Wesley Silva",
                    ultimaCom: nowStr
                },
                falhas: { detectada: "", historico: "", acao: "" },
                manutencao: { ultima: todayStr, custo: "", pecas: "", proxima: "" },
                pendencias: {
                    servico: i === 8 ? "Verificar cabeamento coaxial" : "",
                    material: i === 8 ? "Conector N-Macho" : ""
                },
                observacoes: "",
                fotos: [],
                updatedAt: new Date().toISOString()
            };
            await idb.put('towers', tower);
        }
    },

    renderList(list = this.towers) {
        const container = document.getElementById('tower-list');
        container.innerHTML = '';
        list.sort((a, b) => a.id - b.id);

        list.forEach(t => {
            const div = document.createElement('div');
            // Adiciona classe de status para a borda colorida
            div.className = `card st-${t.status.replace(' ','')}`;
            
            // Verifica pendências para destacar texto
            const hasPendencia = t.pendencias.servico || t.pendencias.material;
            const pendenciaStyle = hasPendencia ? 'text-danger' : '';

            // Função helper para formatar data
            const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
            const fmtDateTime = (d) => d ? new Date(d).toLocaleString('pt-BR') : '-';

            div.innerHTML = `
                <div class="card-header">
                    <strong>🔔 ${t.nome}</strong>
                    <div class="st-${t.status}">
                        <span class="status-pill">${t.status}</span>
                    </div>
                </div>
                
                <div class="card-body">
                    <div class="data-group">
                        <div class="group-title">Informações Gerais</div>
                        <div class="kv-row">
                            <span class="kv-item"><span class="kv-label">Local:</span>${t.geral.localizacao}</span>
                            <span class="kv-item"><span class="kv-label">Tec:</span>${t.geral.tecnico}</span>
                            <span class="kv-item"><span class="kv-label">Prioridade:</span>${t.geral.prioridade}</span>
                        </div>
                         <div class="kv-row">
                            <span class="kv-item"><span class="kv-label">Última Com:</span>${fmtDateTime(t.geral.ultimaCom)}</span>
                        </div>
                    </div>

                    <div class="data-group">
                        <div class="group-title">Técnico</div>
                        ${t.falhas.detectada ? `<div class="kv-row text-danger"><span class="kv-label">Falha:</span>${t.falhas.detectada}</div>` : ''}
                        
                        <div class="kv-row">
                             <span class="kv-item"><span class="kv-label">Manut. Última:</span>${fmtDate(t.manutencao.ultima)}</span>
                             <span class="kv-item"><span class="kv-label">Próxima:</span>${t.manutencao.proxima ? fmtDate(t.manutencao.proxima) : '-'}</span>
                        </div>
                        ${t.manutencao.pecas ? `<div class="kv-row"><span class="kv-label">Peças:</span>${t.manutencao.pecas}</div>` : ''}
                    </div>

                    <div class="data-group">
                        <div class="group-title">Pendências e Obs</div>
                        <div class="kv-row ${t.pendencias.servico ? 'text-danger' : ''}">
                            <span class="kv-label">Serviço:</span>${t.pendencias.servico || 'Nada consta'}
                        </div>
                        <div class="kv-row ${t.pendencias.material ? 'text-danger' : ''}">
                            <span class="kv-label">Material:</span>${t.pendencias.material || 'Nada consta'}
                        </div>
                         ${t.observacoes ? `<div class="kv-row" style="margin-top:5px; font-style:italic; color:#555">"${t.observacoes}"</div>` : ''}
                         ${t.fotos.length > 0 ? `<div class="kv-row" style="margin-top:5px; color:var(--primary)">📷 ${t.fotos.length} fotos anexadas</div>` : ''}
                    </div>
                </div>

                <div class="card-footer">
                    <button class="btn-card btn-pdf-single" onclick="app.generatePDF(${t.id})">PDF</button>
                    <button class="btn-card btn-edit" onclick="app.editTower(${t.id})">Editar</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    // --- PDF ENGINE ---
    
    // Helper para desenhar uma torre em uma página do PDF
    drawTowerPage(doc, t, isGlobal = false) {
        let y = 20;
        
        // Título
        doc.setFontSize(16); doc.setTextColor(0, 86, 179);
        doc.text(`Relatório Técnico: ${t.nome}`, 105, y, null, null, "center");
        y += 8;
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 105, y, null, null, "center");
        y += 12;

        // Função interna para desenhar blocos
        const drawBlock = (title, contentObj) => {
            doc.setFillColor(240, 240, 240); 
            doc.rect(14, y-6, 182, 8, 'F'); 
            doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text(title, 16, y);
            y += 8;
            
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            
            Object.entries(contentObj).forEach(([k, v]) => {
                let label = k.charAt(0).toUpperCase() + k.slice(1);
                // Tratamento de labels
                if(k === 'ultimaCom') label = 'Última Comunicação';
                if(k === 'ultima') label = 'Última Manutenção';
                
                let valStr = v ? v.toString() : "---";
                if (k.includes('ultima') || k.includes('proxima')) {
                     if(v) valStr = new Date(v).toLocaleString();
                }

                // Verifica se precisa de nova página
                if (y > 270) { doc.addPage(); y = 20; }

                doc.setFont("helvetica", "bold");
                doc.text(`${label}:`, 16, y);
                doc.setFont("helvetica", "normal");
                
                const splitVal = doc.splitTextToSize(valStr, 130);
                doc.text(splitVal, 60, y);
                y += (splitVal.length * 5) + 2;
            });
            y += 4;
        };

        drawBlock("Dados Gerais", t.geral);
        drawBlock("Status & Falhas", { status: t.status, ...t.falhas });
        drawBlock("Manutenção", t.manutencao);
        
        // Pendências (em vermelho se houver)
        if (t.pendencias.servico || t.pendencias.material) doc.setTextColor(200, 0, 0);
        drawBlock("Pendências", t.pendencias);
        doc.setTextColor(0);

        if(t.observacoes) {
             doc.setFont("helvetica", "bold"); doc.text("Observações:", 16, y);
             doc.setFont("helvetica", "normal");
             const obs = doc.splitTextToSize(t.observacoes, 170);
             doc.text(obs, 16, y+5);
             y += (obs.length * 5) + 10;
        }

        // Fotos
        if(t.fotos.length > 0) {
            y += 5;
            if(y > 200) { doc.addPage(); y = 20; } // Pula página se tiver no fim
            doc.setFont("helvetica", "bold"); doc.text("Anexos Fotográficos:", 16, y);
            y += 10;
            
            t.fotos.forEach((foto, i) => {
                if(y > 220) { doc.addPage(); y = 20; }
                // Imagem pequena para caber no relatorio
                try {
                    doc.addImage(foto, 'JPEG', 20, y, 80, 60); 
                    // Se for par, desenha ao lado, se impar, quebra linha (lógica simples aqui: lista vertical)
                    doc.text(`Foto ${i+1}`, 110, y+30);
                    y += 70;
                } catch(e) { console.error("Erro img", e); }
            });
        }
    },

    // PDF de uma única torre
    generatePDF(id) {
        const t = this.towers.find(x => x.id == id);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        this.drawTowerPage(doc, t);
        doc.save(`Torre_${t.nome}.pdf`);
    },

    // RELATÓRIO GERAL (TODAS AS TORRES)
    generateGlobalPDF() {
        if(!confirm("Gerar relatório completo de todas as torres? Isso pode levar alguns segundos.")) return;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Capa
        doc.setFontSize(22); doc.setTextColor(0, 86, 179);
        doc.text("Relatório Geral da Rede", 105, 100, null, null, "center");
        doc.setFontSize(14); doc.setTextColor(50);
        doc.text(`Total de Torres: ${this.towers.length}`, 105, 115, null, null, "center");
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 105, 125, null, null, "center");
        
        // Ordena
        const listaOrdenada = [...this.towers].sort((a,b) => a.id - b.id);

        // Gera paginas
        listaOrdenada.forEach((t, index) => {
            doc.addPage(); // Nova página para cada torre
            // Adiciona numeração de página no rodapé
            doc.setFontSize(8); doc.setTextColor(150);
            doc.text(`Página ${index + 1}`, 200, 290, null, null, "right");
            
            this.drawTowerPage(doc, t, true);
        });

        doc.save(`Relatorio_Geral_Rede_${new Date().toISOString().slice(0,10)}.pdf`);
    },

    // --- RESTANTE DO CÓDIGO (Modal, Sync, etc) ---
    filterList() {
        const term = document.getElementById('search').value.toLowerCase();
        const filtered = this.towers.filter(t => 
            t.nome.toLowerCase().includes(term) || 
            t.status.toLowerCase().includes(term) ||
            t.falhas.detectada.toLowerCase().includes(term)
        );
        this.renderList(filtered);
    },

    openModal() { /* Removido botão criar, apenas editar */ },
    
    closeModal() {
        document.getElementById('modal').style.display = 'none';
        this.tempPhotos = [];
    },

    editTower(id) {
        const t = this.towers.find(x => x.id == id);
        if (!t) return;
        
        this.tempPhotos = [...t.fotos] || [];
        document.getElementById('tower-form').reset();
        document.getElementById('image-preview-container').innerHTML = '';
        
        document.getElementById('tower-id').value = t.id;
        document.getElementById('f-nome').value = t.nome;
        document.getElementById('f-status').value = t.status;
        
        // Popula campos aninhados
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

    handleImagePreview(event) {
        const files = event.target.files;
        if (!files) return;
        const remaining = 3 - this.tempPhotos.length;
        Array.from(files).slice(0, remaining).forEach(file => {
             this.resizeImage(file, 800, 800, (b64) => {
                 this.tempPhotos.push(b64);
                 this.renderImagePreviews();
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
                let ratio = Math.min(w / img.width, h / img.height);
                // Se a imagem for menor que o limite, não aumenta
                if (ratio > 1) ratio = 1; 
                
                const canvas = document.createElement('canvas');
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                cb(canvas.toDataURL('image/jpeg', 0.6)); // Compressão 0.6
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
    
    removePhoto(i) {
        this.tempPhotos.splice(i, 1);
        this.renderImagePreviews();
    },

    async saveTower(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('tower-id').value);
        
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
            fotos: this.tempPhotos,
            updatedAt: new Date().toISOString()
        };

        await idb.put('towers', tower);
        await idb.put('outbox', tower);
        this.towers = await idb.getAll('towers');
        this.renderList();
        this.closeModal();
        if (navigator.onLine) this.processOutbox();
    },

    async updateOnlineStatus() {
        const el = document.getElementById('connection-status');
        if (navigator.onLine) {
            el.innerText = "Online"; el.className = "status-badge online";
            this.processOutbox();
        } else {
            el.innerText = "Offline"; el.className = "status-badge offline";
        }
    },

    async processOutbox() {
        const items = await idb.getAll('outbox');
        if (items.length === 0) return;
        try {
            await fetch('/api/towers', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(items)
            });
            await idb.clear('outbox');
        } catch(e) { console.error(e); }
    },

    async syncNow() {
        if (!navigator.onLine) return alert("Offline");
        await this.processOutbox();
        try {
            const res = await fetch('/api/towers');
            const data = await res.json();
            if(Array.isArray(data) && data.length > 0) {
                for(const t of data) await idb.put('towers', t);
                this.towers = await idb.getAll('towers');
                this.renderList();
                alert("Sincronizado!");
            }
        } catch(e) { console.error(e); }
    }
};

window.onload = () => app.init();

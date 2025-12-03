const app = {
    towers: [],
    tempPhotos: [], // Armazena fotos em base64 durante a edição no modal

    async init() {
        await idb.open();
        this.towers = await idb.getAll('towers');
        
        // Se DB vazio, gera as 25 torres iniciais
        if (this.towers.length === 0) {
            console.log("Populando DB inicial (01-25)...");
            await this.seedDatabase();
            this.towers = await idb.getAll('towers');
        }

        this.renderList();
        this.updateOnlineStatus();

        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js').catch(err => console.error('Erro SW:', err));
        }

        if (navigator.onLine) this.syncNow();
    },

    // --- GERAÇÃO DE DADOS INICIAIS ---
    async seedDatabase() {
        const nowStr = new Date().toISOString().slice(0, 16); // Formato para datetime-local
        const todayStr = new Date().toISOString().split('T')[0]; // Formato para date

        for (let i = 1; i <= 25; i++) {
            const idStr = i.toString().padStart(2, '0');
            // Estrutura de dados baseada na imagem ER 08
            const tower = {
                id: i,
                nome: `ER ${idStr}`,
                status: i % 5 === 0 ? "Falha" : "Operando", // Algumas em falha para exemplo
                // Dados aninhados conforme a imagem
                geral: {
                    localizacao: `CDS - Setor ${String.fromCharCode(65 + (i%5))}`,
                    prioridade: "Média",
                    tecnico: "Wesley Silva",
                    ultimaCom: nowStr
                },
                falhas: { detectada: "", historico: "", acao: "" },
                manutencao: { ultima: todayStr, custo: "", pecas: "", proxima: "" },
                pendencias: {
                    servico: i === 8 ? "Verificar cabeamento" : "", // Exemplo para ER 08
                    material: i === 8 ? "PCI de impedância" : ""
                },
                observacoes: i === 8 ? "Placa PCI apresentou defeito, levar para análise." : "",
                fotos: [], // Array de strings Base64
                updatedAt: new Date().toISOString()
            };
            await idb.put('towers', tower);
        }
    },

    // --- RENDERIZAÇÃO DA LISTA ---
    renderList(list = this.towers) {
        const container = document.getElementById('tower-list');
        container.innerHTML = '';
        
        list.sort((a, b) => a.id - b.id); // Ordena por ID

        list.forEach(t => {
            // Verifica se há pendências para mostrar o alerta
            const temPendencias = t.pendencias.servico || t.pendencias.material;

            const div = document.createElement('div');
            div.className = 'card';
            // Template string literal robusto para o card
            div.innerHTML = `
                <div class="card-header">
                    <span>🔔 ${t.nome}</span>
                    <span class="status-pill st-${t.status}">${t.status}</span>
                </div>
                
                ${temPendencias ? `<div class="warning-alert">⚠️ Pendências encontradas — verifique!</div>` : ''}
                
                <div class="card-body">
                    <div class="info-row"><span class="info-label">Localização:</span><span>${t.geral.localizacao}</span></div>
                    <div class="info-row"><span class="info-label">Técnico:</span><span>${t.geral.tecnico}</span></div>
                    <div class="info-row"><span class="info-label">Última Com.:</span><span style="font-size:0.8rem">${new Date(t.geral.ultimaCom).toLocaleString()}</span></div>
                    ${t.pendencias.material ? `<div class="info-row" style="color:var(--danger)"><span class="info-label">Pend. Material:</span><span>${t.pendencias.material}</span></div>` : ''}
                </div>

                <div class="card-footer">
                     <button class="btn-pdf" onclick="app.generatePDF(${t.id})">📄 PDF</button>
                    <button class="btn-edit" onclick="app.editTower(${t.id})">✏️ Editar</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    filterList() {
        const term = document.getElementById('search').value.toLowerCase();
        const filtered = this.towers.filter(t => t.nome.toLowerCase().includes(term));
        this.renderList(filtered);
    },

    // --- MODAL E EDIÇÃO ---
    closeModal() {
        document.getElementById('modal').style.display = 'none';
        this.tempPhotos = []; // Limpa fotos temporárias
    },

    editTower(id) {
        const t = this.towers.find(x => x.id == id);
        if (!t) return;
        
        document.getElementById('tower-form').reset();
        document.getElementById('image-preview-container').innerHTML = '';
        this.tempPhotos = [...t.fotos] || []; // Copia fotos existentes

        // Popula os campos do formulário com os dados aninhados
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

     // --- GERENCIAMENTO DE FOTOS (Otimizado para Mobile) ---
     handleImagePreview(event) {
        const files = event.target.files;
        if (!files) return;

        const remainingSlots = 3 - this.tempPhotos.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        if (files.length > remainingSlots) alert("Máximo de 3 fotos permitido.");

        filesToProcess.forEach(file => {
             // Redimensiona a imagem no cliente antes de salvar para economizar espaço no IndexedDB
             this.resizeImage(file, 800, 800, (resizedBase64) => {
                 this.tempPhotos.push(resizedBase64);
                 this.renderImagePreviews();
             });
        });
        event.target.value = ''; // Limpa o input
    },

    // Função auxiliar para redimensionar imagens usando Canvas
    resizeImage(file, maxWidth, maxHeight, callback) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                 // Lógica de redimensionamento proporcional
                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Retorna JPEG com qualidade 0.7
                callback(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    },

    renderImagePreviews() {
        const container = document.getElementById('image-preview-container');
        container.innerHTML = '';
        this.tempPhotos.forEach((photoB64, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'img-preview-wrapper';
            wrapper.innerHTML = `
                <img src="${photoB64}" class="img-preview">
                <button type="button" class="btn-remove-img" onclick="app.removePhoto(${index})">&times;</button>
            `;
            container.appendChild(wrapper);
        });
    },

    removePhoto(index) {
        this.tempPhotos.splice(index, 1);
        this.renderImagePreviews();
    },

    // --- SALVAR E SINCRONIZAR ---
    async saveTower(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('tower-id').value);
        
        //Reconstruindo o objeto complexo
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
            fotos: this.tempPhotos, // Salva o array de base64
            updatedAt: new Date().toISOString()
        };

        await idb.put('towers', tower);
        await idb.put('outbox', tower);

        this.towers = await idb.getAll('towers');
        this.renderList();
        this.closeModal();

        if (navigator.onLine) this.processOutbox();
    },

     // --- PDF GERATOR (Layout baseado na imagem) ---
    generatePDF(id) {
        const t = this.towers.find(x => x.id == id);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let y = 15; // Cursor vertical

        // Header
        doc.setFontSize(18); doc.setTextColor(0, 86, 179);
        doc.text(`Relatório Técnico: ${t.nome}`, 105, y, null, null, "center");
        y += 10;
        doc.setFontSize(12); doc.setTextColor(50);
        doc.text(`Status: ${t.status}`, 14, y);
        y += 10;
        
        // Helper para desenhar seções
        const drawSection = (title, dataObj) => {
            doc.setFontSize(14); doc.setTextColor(0);
            doc.setFillColor(240, 240, 240); doc.rect(14, y-5, 182, 8, 'F'); // Fundo cinza no titulo
            doc.text(title, 16, y);
            y += 8;
            doc.setFontSize(11);
            Object.entries(dataObj).forEach(([key, value]) => {
                 // Formata labels (ex: ultimaCom -> Última Com)
                let label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                if(key.includes("Com")) label = "Última Comunicação";
                 // Limpa valores nulos ou datas
                let displayValue = value || "---";
                if(key.includes("ultima") && value) displayValue = new Date(value).toLocaleString();

                doc.text(`${label}:`, 16, y);
                // Quebra de linha automática para textos longos
                const splitText = doc.splitTextToSize(displayValue.toString(), 130);
                doc.text(splitText, 65, y);
                y += (splitText.length * 5) + 2;
            });
            y += 5;
        };

        drawSection("Informações Gerais", t.geral);
        drawSection("Falhas e Ações", t.falhas);
        drawSection("Manutenção", t.manutencao);
        
        // Seção Pendências com destaque se houver
        if(t.pendencias.servico || t.pendencias.material) {
             doc.setTextColor(220, 53, 69); // Vermelho
             drawSection("PENDÊNCIAS ALERT", t.pendencias);
             doc.setTextColor(50);
        } else {
             drawSection("Pendências", t.pendencias);
        }
        
        // Observações
        doc.setFontSize(14); doc.text("Observações", 16, y); y+=8;
        doc.setFontSize(11);
        const obsText = doc.splitTextToSize(t.observacoes || "Sem observações.", 180);
        doc.text(obsText, 16, y);
        y += (obsText.length * 5) + 10;

        // Fotos
        if (t.fotos.length > 0) {
            doc.addPage();
            doc.setFontSize(14); doc.text("Anexos Fotográficos", 16, 20);
            let imgY = 30;
            t.fotos.forEach((photoB64, i) => {
                 // Adiciona imagem (formato JPEG, posição X, Y, Largura, Altura)
                doc.addImage(photoB64, 'JPEG', 20, imgY, 160, 120);
                doc.text(`Foto ${i+1}`, 20, imgY + 125);
                imgY += 140;
                // Se passar de 2 fotos na página, cria nova página
                if (i === 1 && t.fotos.length > 2) { doc.addPage(); imgY = 30; }
            });
        }

        doc.save(`relatorio_${t.nome.replace(' ','')}.pdf`);
    },

    // --- SINCRONIZAÇÃO (Mantida do original) ---
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
        const outboxItems = await idb.getAll('outbox');
        if (outboxItems.length === 0) return;
        console.log(`Syncing ${outboxItems.length} items...`);
        try {
            const res = await fetch('/api/towers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(outboxItems)
            });
            if (res.ok) { await idb.clear('outbox'); console.log('Sync concluído'); }
        } catch (err) { console.error('Falha no sync:', err); }
    },

    async syncNow() {
        if (!navigator.onLine) return alert("Você está offline.");
        await this.processOutbox();
        try {
            const res = await fetch('/api/towers');
            const remoteData = await res.json();
            if (Array.isArray(remoteData) && remoteData.length > 0) {
                for (const item of remoteData) await idb.put('towers', item);
                this.towers = await idb.getAll('towers');
                this.renderList();
                alert("Sincronizado!");
            } else {
                 console.log("Servidor vazio ou sem novos dados.");
            }
        } catch (e) { console.error("Erro sync remote", e); }
    }
};

window.onload = () => app.init();

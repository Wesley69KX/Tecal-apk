const DEFAULT_TOWERS = [
    { id: 1, nome: "Torre Padrão A", status: "Online", bateria: "100%", local: "Centro" },
    { id: 2, nome: "Torre Padrão B", status: "Offline", bateria: "0%", local: "Zona Rural" }
];

const app = {
    towers: [],

    async init() {
        await idb.open();
        
        // 1. Carrega dados locais
        this.towers = await idb.getAll('towers');
        
        // Se vazio, popula com default
        if (this.towers.length === 0) {
            console.log("DB vazio, carregando defaults...");
            for (const t of DEFAULT_TOWERS) {
                await idb.put('towers', t);
            }
            this.towers = await idb.getAll('towers');
        }

        this.renderList();
        this.updateOnlineStatus();

        // Listeners de rede
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
        
        // Registra Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js')
                .then(() => console.log('SW registrado'))
                .catch(err => console.error('Erro SW:', err));
        }

        // Tenta sincronizar se online na abertura
        if (navigator.onLine) {
            this.syncNow();
        }
    },

    renderList(list = this.towers) {
        const container = document.getElementById('tower-list');
        container.innerHTML = '';
        list.forEach(t => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <div class="card-header">
                    <span>${t.nome}</span>
                    <span class="status-dot st-${t.status}"></span>
                </div>
                <div class="card-details">
                    <p>📍 ${t.local}</p>
                    <p>🔋 ${t.bateria}</p>
                    <p>📡 Status: ${t.status}</p>
                </div>
                <div class="card-actions">
                    <button class="btn-edit" onclick="app.editTower(${t.id})">Editar</button>
                    <button class="btn-pdf" onclick="app.generatePDF(${t.id})">PDF</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    filterList() {
        const term = document.getElementById('search').value.toLowerCase();
        const filtered = this.towers.filter(t => 
            t.nome.toLowerCase().includes(term) || 
            t.local.toLowerCase().includes(term)
        );
        this.renderList(filtered);
    },

    openModal() {
        document.getElementById('tower-form').reset();
        document.getElementById('tower-id').value = Date.now(); // Novo ID temp
        document.getElementById('modal-title').innerText = "Nova Torre";
        document.getElementById('modal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('modal').style.display = 'none';
    },

    editTower(id) {
        const t = this.towers.find(x => x.id == id);
        if (!t) return;
        document.getElementById('tower-id').value = t.id;
        document.getElementById('tower-name').value = t.nome;
        document.getElementById('tower-location').value = t.local;
        document.getElementById('tower-status').value = t.status;
        document.getElementById('tower-battery').value = t.bateria;
        document.getElementById('modal-title').innerText = "Editar Torre";
        document.getElementById('modal').style.display = 'flex';
    },

    async saveTower(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('tower-id').value);
        
        const tower = {
            id: id,
            nome: document.getElementById('tower-name').value,
            local: document.getElementById('tower-location').value,
            status: document.getElementById('tower-status').value,
            bateria: document.getElementById('tower-battery').value,
            updatedAt: new Date().toISOString()
        };

        // Salva local (IndexedDB)
        await idb.put('towers', tower);
        
        // Adiciona à Outbox para sync
        await idb.put('outbox', tower);

        // Atualiza UI
        this.towers = await idb.getAll('towers');
        this.renderList();
        this.closeModal();

        // Tenta sync se online
        if (navigator.onLine) {
            this.processOutbox();
        }
    },

    async updateOnlineStatus() {
        const el = document.getElementById('connection-status');
        if (navigator.onLine) {
            el.innerText = "Online";
            el.className = "status-badge online";
            this.processOutbox();
        } else {
            el.innerText = "Offline";
            el.className = "status-badge offline";
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

            if (res.ok) {
                // Limpa outbox após sucesso
                await idb.clear('outbox');
                console.log('Sync concluído');
            }
        } catch (err) {
            console.error('Falha no sync:', err);
        }
    },

    async syncNow() {
        if (!navigator.onLine) {
            alert("Você está offline. As alterações serão salvas localmente.");
            return;
        }

        // 1. Envia pendências
        await this.processOutbox();

        // 2. Busca dados do servidor (estratégia simples: servidor ganha)
        try {
            const res = await fetch('/api/towers');
            const remoteData = await res.json();
            
            if (Array.isArray(remoteData)) {
                for (const item of remoteData) {
                    await idb.put('towers', item);
                }
                this.towers = await idb.getAll('towers');
                this.renderList();
                alert("Sincronizado com sucesso!");
            }
        } catch (e) {
            console.error("Erro ao buscar dados remotos", e);
        }
    },

    generatePDF(id) {
        const t = this.towers.find(x => x.id == id);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text(`Relatório da Torre: ${t.nome}`, 10, 10);
        doc.text(`ID: ${t.id}`, 10, 20);
        doc.text(`Local: ${t.local}`, 10, 30);
        doc.text(`Status: ${t.status}`, 10, 40);
        doc.text(`Bateria: ${t.bateria}`, 10, 50);
        doc.text(`Data: ${new Date().toLocaleString()}`, 10, 60);

        doc.save(`torre_${t.id}.pdf`);
    },

    downloadCSV() {
        const header = ["ID", "Nome", "Local", "Status", "Bateria"];
        const rows = this.towers.map(t => [t.id, t.nome, t.local, t.status, t.bateria]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + header.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_torres.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

window.onload = () => app.init();

// Simulação de Backend para Vercel Serverless
// NOTA: Em produção, conecte isso a um banco real (Postgres/Supabase/MongoDB).
// O sistema de arquivos do Vercel é somente leitura (read-only) em tempo de execução,
// então as alterações aqui não persistirão permanentemente entre deploys.

let memoryDb = [
  { id: 1700000000001, nome: "Torre Alpha", status: "Online", bateria: "98%", local: "Setor Norte" },
  { id: 1700000000002, nome: "Torre Beta", status: "Offline", bateria: "12%", local: "Setor Sul" },
  { id: 1700000000003, nome: "Torre Gamma", status: "Manutenção", bateria: "100%", local: "Centro" }
];

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(memoryDb);
  }

  if (req.method === 'POST') {
    // Recebe itens da Outbox ou um array completo
    const data = req.body;
    
    // Lógica simples de merge (em um DB real, usaria UPSERT)
    if (Array.isArray(data)) {
        data.forEach(item => {
            const index = memoryDb.findIndex(t => t.id === item.id);
            if (index > -1) {
                memoryDb[index] = item; // Atualiza
            } else {
                memoryDb.push(item); // Cria
            }
        });
    }

    return res.status(200).json({ success: true, message: "Sincronizado", currentData: memoryDb });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

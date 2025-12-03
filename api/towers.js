// Simulação de Backend - Em produção, use um banco de dados real (ex: Supabase/Postgres)

// Array vazio inicial. O front-end é responsável por popular os dados iniciais (01-25)
// e sincronizar para cá.
let memoryDb = [];

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(memoryDb);
  }

  if (req.method === 'POST') {
    const data = req.body;
    
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

    // Em um cenário real, você não retornaria todo o DB, apenas confirmação.
    return res.status(200).json({ success: true, message: "Dados sincronizados", count: memoryDb.length });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

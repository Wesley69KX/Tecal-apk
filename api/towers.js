// api/towers.js
import fs from 'fs';
const DB_PATH = './public/db.json';

export default function handler(req, res){
  if(req.method === 'GET'){
    try{
      if(!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      return res.status(200).json(data);
    }catch(e){
      return res.status(500).json({ error: String(e) });
    }
  }

  if(req.method === 'POST'){
    try{
      // body may be an array (full sync) or a single item / outbox item
      const body = req.body;
      let db = [];
      if(fs.existsSync(DB_PATH)) db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      // if body is array -> replace DB
      if(Array.isArray(body)){
        db = body;
      } else if(body && body.type){
        // outbox item handling
        if(body.type === 'create' && body.data){
          db.push(body.data);
        } else if(body.type === 'update' && body.Torre && body.updates){
          const idx = db.findIndex(x=> x.Torre === body.Torre);
          if(idx >= 0) db[idx] = body.updates;
          else db.push(body.updates);
        } else {
          // generic push
          db.push(body);
        }
      } else {
        // push raw
        db.push(body);
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
      return res.status(200).json({ ok: true });
    }catch(e){
      return res.status(500).json({ error: String(e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

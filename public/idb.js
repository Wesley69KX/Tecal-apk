/* idb helper */
const DB_NAME = 'torres-pwa-db';
const DB_VERSION = 1;
let db;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e=>{
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains('towers')) {
        idb.createObjectStore('towers', { keyPath: 'Torre' });
      }
      if (!idb.objectStoreNames.contains('outbox')) {
        idb.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

async function idbPut(store, value){
  await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readwrite');
    const s = tx.objectStore(store);
    const r = s.put(value);
    r.onsuccess = ()=>res(r.result);
    r.onerror = ()=>rej(r.error);
  });
}
async function idbGet(store, key){
  await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readonly');
    const s = tx.objectStore(store);
    const r = s.get(key);
    r.onsuccess = ()=>res(r.result);
    r.onerror = ()=>rej(r.error);
  });
}
async function idbGetAll(store){
  await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readonly');
    const s = tx.objectStore(store);
    const r = s.getAll();
    r.onsuccess = ()=>res(r.result);
    r.onerror = ()=>rej(r.error);
  });
}
async function idbDelete(store, key){
  await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readwrite');
    const s = tx.objectStore(store);
    const r = s.delete(key);
    r.onsuccess = ()=>res();
    r.onerror = ()=>rej(r.error);
  });
}

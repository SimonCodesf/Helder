import { clone } from "./utils.js?v=3.1.35";
// Atomic snapshot persistence. IndexedDB also works offline and avoids localStorage's small quota.
const DB_NAME = "helder-v1";
let dbPromise;
function openDB() {
  if (!globalThis.indexedDB)
    return Promise.reject(
      new Error(
        "Deze browser ondersteunt geen lokale opslag. Gebruik een recente browser, niet de privémodus.",
      ),
    );
  if (!dbPromise)
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("state");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () =>
        reject(new Error("Sluit andere oude Helder-tabs en probeer opnieuw."));
    });
  return dbPromise;
}
export async function loadCollection() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readonly");
    const req = tx.objectStore("state").get("collection");
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}
export class ConflictError extends Error {
  constructor() {
    super(
      "Je collectie is gewijzigd in een andere tab. Herlaad deze tab voordat je verdergaat.",
    );
    this.name = "ConflictError";
  }
}
export async function saveCollection(value, expectedRevision) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite"),
      store = tx.objectStore("state");
    let conflict = false;
    const req = store.get("collection");
    req.onsuccess = () => {
      if ((req.result?.revision ?? 0) !== expectedRevision) {
        conflict = true;
        tx.abort();
        return;
      }
      store.put(clone(value), "collection");
    };
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error ?? new Error("Opslaan mislukt."));
    tx.onabort = () =>
      reject(
        conflict
          ? new ConflictError()
          : (tx.error ?? new Error("Opslaan geannuleerd.")),
      );
  });
}
export async function requestPersistentStorage() {
  return navigator.storage?.persist ? navigator.storage.persist() : false;
}

// Device/account metadata and OAuth session are separate from exported cards.
export async function getDeviceValue(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = db
      .transaction("state", "readonly")
      .objectStore("state")
      .get("device:" + key);
    r.onsuccess = () => resolve(r.result ?? null);
    r.onerror = () => reject(r.error);
  });
}
export async function setDeviceValue(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction("state", "readwrite"),
      s = t.objectStore("state");
    value == null
      ? s.delete("device:" + key)
      : s.put(clone(value), "device:" + key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

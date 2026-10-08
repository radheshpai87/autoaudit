import type { InspectApiResponse } from "./api";

interface StoredInspection {
  id: string;
  fileName: string;
  image: Blob;
  response: InspectApiResponse;
}

const DB_NAME = "autoaudit-inspections-v1";
const STORE_NAME = "results";

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local inspection storage."));
  });
}

export async function saveStoredInspection(id: string, file: File, response: InspectApiResponse): Promise<void> {
  const db = await openStore();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ id, fileName: file.name, image: file, response } satisfies StoredInspection);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save this inspection."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Inspection storage was interrupted."));
  });
  db.close();
}

export async function getStoredInspection(id: string): Promise<StoredInspection | undefined> {
  const db = await openStore();
  const value = await new Promise<StoredInspection | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredInspection | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not load the saved inspection."));
  });
  db.close();
  return value;
}

import type { InspectApiResponse } from "./api";
import type { InspectionUploadLog } from "./types";

interface StoredInspection {
  id: string;
  fileName: string;
  image: Blob;
  response: InspectApiResponse;
}

const DB_NAME = "autoaudit-inspections-v1";
const DB_VERSION = 2;
const STORE_NAME = "results";
const LOG_STORE_NAME = "logs";
interface StoredLogCollection { id: "all"; entries: InspectionUploadLog[] }

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
      if (!db.objectStoreNames.contains(LOG_STORE_NAME)) db.createObjectStore(LOG_STORE_NAME, { keyPath: "id" });
    };
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

export async function saveStoredInspectionLogs(entries: InspectionUploadLog[]): Promise<void> {
  const db = await openStore();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(LOG_STORE_NAME, "readwrite");
    transaction.objectStore(LOG_STORE_NAME).put({ id: "all", entries } satisfies StoredLogCollection);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save inspection history."));
    transaction.onabort = () => reject(transaction.error ?? new Error("History storage was interrupted."));
  });
  db.close();
}

export async function getStoredInspectionLogs(): Promise<InspectionUploadLog[]> {
  const db = await openStore();
  const collection = await new Promise<StoredLogCollection | undefined>((resolve, reject) => {
    const request = db.transaction(LOG_STORE_NAME, "readonly").objectStore(LOG_STORE_NAME).get("all");
    request.onsuccess = () => resolve(request.result as StoredLogCollection | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not load inspection history."));
  });
  db.close();
  return Array.isArray(collection?.entries) ? collection.entries : [];
}

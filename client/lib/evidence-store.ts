import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

// Photos/PDFs can exceed browser localStorage and Android AsyncStorage row
// limits. Store large evidence in IndexedDB on web and app documents on native.
let webDatabase: Promise<IDBDatabase> | undefined;
const locks = new Map<string, Promise<unknown>>();

function openDatabase(): Promise<IDBDatabase> {
  if (!webDatabase) {
    webDatabase = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("This browser cannot store offline evidence. Use a browser with IndexedDB enabled."));
        return;
      }
      const request = indexedDB.open("bookflowx-evidence", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("records");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Offline evidence storage could not be opened."));
    });
  }
  return webDatabase;
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    const database = await openDatabase();
    const stored = await new Promise<string | null>((resolve, reject) => {
      const transaction = database.transaction("records", "readonly");
      const request = transaction.objectStore("records").get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(new Error("Saved evidence could not be read."));
    });
    if (stored !== null) return stored;
  } else {
    const uri = await AsyncStorage.getItem(`${key}_file`);
    if (uri) return FileSystem.readAsStringAsync(uri);
  }
  // Read older small local drafts without discarding them during the upgrade.
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, content: string): Promise<void> {
  if (Platform.OS === "web") {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("records", "readwrite");
      transaction.objectStore("records").put(content, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("Offline evidence could not be saved. Check available device storage."));
      transaction.onabort = () => reject(new Error("Offline evidence save was interrupted; the previous version was kept."));
    });
    return;
  }
  if (!FileSystem.documentDirectory) throw new Error("Device document storage is unavailable.");
  const previous = await AsyncStorage.getItem(`${key}_file`);
  const uri = `${FileSystem.documentDirectory}${key}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  // Commit the small pointer only after the complete evidence file is written.
  await FileSystem.writeAsStringAsync(uri, content);
  await AsyncStorage.setItem(`${key}_file`, uri);
  if (previous) {
    try { await FileSystem.deleteAsync(previous, { idempotent: true }); }
    catch { /* Cleanup failure must not undo a successful evidence save. */ }
  }
}

async function updateItem(key: string, update: (raw: string | null) => string): Promise<void> {
  const pending = locks.get(key) || Promise.resolve();
  const next = pending.catch(() => undefined).then(async () => {
    const content = update(await getItem(key));
    await setItem(key, content);
  });
  locks.set(key, next);
  try { await next; }
  finally { if (locks.get(key) === next) locks.delete(key); }
}

export const evidenceStore = { getItem, updateItem };
import { constants as fsConstants, promises as fs } from "node:fs";
import path from "node:path";
import type { DatabaseShape } from "@/lib/types";

const SOURCE_DB_PATH = path.join(/* turbopackIgnore: true */ process.cwd(), "data", "mock-db.json");
const RUNTIME_DATA_DIR = path.join(
  process.env.TMPDIR ?? process.env.TEMP ?? process.env.TMP ?? path.join(process.cwd(), "data", ".runtime"),
  "glam-lyn",
);
const RUNTIME_DB_PATH = path.join(RUNTIME_DATA_DIR, "mock-db.json");

let writeQueue: Promise<unknown> = Promise.resolve();
let initialized = false;
let memoryDb: DatabaseShape | null = null;

async function loadSeedDb() {
  const raw = await fs.readFile(SOURCE_DB_PATH, "utf8");
  return JSON.parse(raw) as DatabaseShape;
}

async function ensureRuntimeDb() {
  if (initialized) {
    return;
  }

  try {
    await fs.mkdir(RUNTIME_DATA_DIR, { recursive: true });

    try {
      await fs.access(RUNTIME_DB_PATH, fsConstants.F_OK);
    } catch {
      const raw = await fs.readFile(SOURCE_DB_PATH, "utf8");
      await fs.writeFile(RUNTIME_DB_PATH, raw, "utf8");
    }
  } catch {
    memoryDb = await loadSeedDb();
  } finally {
    initialized = true;
  }
}

export async function getWritableUploadsDir() {
  await ensureRuntimeDb();
  const uploadsDir = path.join(RUNTIME_DATA_DIR, "uploads");

  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    return uploadsDir;
  } catch {
    return null;
  }
}

export async function readDb() {
  await ensureRuntimeDb();

  if (memoryDb) {
    return structuredClone(memoryDb);
  }

  const raw = await fs.readFile(RUNTIME_DB_PATH, "utf8");
  return JSON.parse(raw) as DatabaseShape;
}

export async function writeDb(data: DatabaseShape) {
  await ensureRuntimeDb();
  const serialized = JSON.stringify(data, null, 2);

  if (memoryDb) {
    memoryDb = JSON.parse(serialized) as DatabaseShape;
    return;
  }

  try {
    await fs.writeFile(RUNTIME_DB_PATH, serialized, "utf8");
  } catch {
    memoryDb = JSON.parse(serialized) as DatabaseShape;
  }
}

export async function updateDb<T>(
  updater: (db: DatabaseShape) => Promise<T> | T,
) {
  const task = async () => {
    const db = await readDb();
    const result = await updater(db);
    await writeDb(db);
    return result;
  };

  const pending = writeQueue.then(task, task);
  writeQueue = pending.then(
    () => undefined,
    () => undefined,
  );

  return pending;
}

import { promises as fs } from "node:fs";
import path from "node:path";
import type { DatabaseShape } from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "data", "mock-db.json");

let writeQueue: Promise<unknown> = Promise.resolve();

export async function readDb() {
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as DatabaseShape;
}

export async function writeDb(data: DatabaseShape) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf8");
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

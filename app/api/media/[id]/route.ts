import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { readDb } from "@/lib/mock-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await readDb();
  const asset = db.mediaAssets.find((entry) => entry.id === id);

  if (!asset?.storagePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await fs.readFile(asset.storagePath);
  return new NextResponse(file, {
    headers: {
      "Content-Type": asset.mimeType ?? "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}

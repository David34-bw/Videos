import fs from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { getDb, mediaPath, updateDb } from "@/lib/server/storage";
import { sanitizePerson } from "@/lib/server/people";
import { errorMessage, jsonError } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const person = (await getDb()).people.find((p) => p.id === id);
  return person ? NextResponse.json({ person }) : jsonError("No encontrada", 404);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = await req.json();
    const person = await updateDb((db) => {
      const i = db.people.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("No encontrada");
      db.people[i] = sanitizePerson(body, db.people[i]);
      return db.people[i];
    });
    return NextResponse.json({ person });
  } catch (e) {
    return jsonError(errorMessage(e));
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const removed = await updateDb((db) => {
    const p = db.people.find((x) => x.id === id);
    db.people = db.people.filter((x) => x.id !== id);
    return p;
  });
  // Borra también las fotos en caché local (no toca Google Drive)
  for (const ph of removed?.photos ?? []) await fs.rm(mediaPath(ph.file), { force: true });
  return NextResponse.json({ ok: true });
}

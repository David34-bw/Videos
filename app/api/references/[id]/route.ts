import fs from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { getDb, mediaPath, updateDb } from "@/lib/server/storage";
import { errorMessage, jsonError } from "@/lib/server/http";
import type { Motion, Transition } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const TRANSITIONS: Transition[] = ["cut", "fade", "slide", "zoom", "flash"];
const MOTIONS: Motion[] = ["zoom-in", "zoom-out", "pan-left", "pan-right", "still"];

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const reference = (await getDb()).references.find((r) => r.id === id);
  return reference ? NextResponse.json({ reference }) : jsonError("No encontrada", 404);
}

/** Edita nombre y, por segmento, transición, movimiento y texto */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = (await req.json()) as {
      name?: string;
      segments?: Array<{ transition?: string; motion?: string; text?: string }>;
    };
    const reference = await updateDb((db) => {
      const r = db.references.find((x) => x.id === id);
      if (!r) throw new Error("No encontrada");
      if (typeof body.name === "string" && body.name.trim()) r.name = body.name.trim().slice(0, 80);
      body.segments?.forEach((s, i) => {
        const seg = r.spec.segments[i];
        if (!seg) return;
        if (TRANSITIONS.includes(s.transition as Transition)) seg.transition = s.transition as Transition;
        if (MOTIONS.includes(s.motion as Motion)) seg.motion = s.motion as Motion;
        if (typeof s.text === "string") seg.text = s.text.slice(0, 120) || undefined;
      });
      return r;
    });
    return NextResponse.json({ reference });
  } catch (e) {
    return jsonError(errorMessage(e));
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const removed = await updateDb((db) => {
    const r = db.references.find((x) => x.id === id);
    db.references = db.references.filter((x) => x.id !== id);
    return r;
  });
  const files = [...(removed?.frames ?? []), ...(removed?.spec.audio ? [removed.spec.audio] : [])];
  for (const f of files) await fs.rm(mediaPath(f), { force: true });
  return NextResponse.json({ ok: true });
}

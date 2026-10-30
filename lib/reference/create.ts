import "server-only";
import { analyzeVideo, extractAudio, extractFrames, LUMA_RATE } from "./analyze";
import { toSpec } from "./toSpec";
import { newId } from "../server/storage";
import type { Reference } from "../types";

/** Analiza un video local y arma la plantilla réplica */
export async function createReference(file: string, name: string, sourceUrl?: string): Promise<Reference> {
  const a = await analyzeVideo(file);
  if (a.probe.duration < 1) throw new Error("El video es demasiado corto");
  if (a.probe.duration > 180) throw new Error("Usa un video de máximo 3 minutos");
  const audio = a.probe.hasAudio ? await extractAudio(file) : null;
  const spec = toSpec({
    duration: a.probe.duration,
    width: a.probe.width,
    height: a.probe.height,
    cuts: a.cuts,
    onsets: a.onsets,
    bpm: a.bpm,
    luma: a.luma,
    lumaRate: LUMA_RATE,
    audio,
  });
  const frames = await extractFrames(
    file,
    spec.segments.map((s) => s.start + s.duration / 2),
  );
  return {
    id: newId(),
    name: name.trim().slice(0, 80) || "Video de referencia",
    sourceUrl,
    createdAt: new Date().toISOString(),
    frames,
    spec,
  };
}

import type { Motion, SpecSegment, TemplateSpec, Transition } from "../types";

export interface SpecInput {
  duration: number;
  width: number;
  height: number;
  cuts: number[];
  onsets: number[];
  bpm: number | null;
  luma: number[];
  lumaRate: number;
  audio: string | null;
}

const MIN_SEGMENT = 0.25;
const MAX_SEGMENT = 4;
const SNAP_WINDOW = 0.12;
const MAX_SEGMENTS = 80;
const MOTIONS: Motion[] = ["zoom-in", "pan-left", "zoom-out", "pan-right"];

function nearest(values: number[], t: number): number | null {
  let best: number | null = null;
  for (const v of values) if (best === null || Math.abs(v - t) < Math.abs(best - t)) best = v;
  return best;
}

/** Redimensiona a 1080 de ancho manteniendo la proporción (máx. 1920 de alto) */
function normalizeSize(w: number, h: number): { width: number; height: number } {
  let width = 1080;
  let height = Math.round((1080 * h) / w / 2) * 2;
  if (height > 1920) {
    height = 1920;
    width = Math.round((1920 * w) / h / 2) * 2;
  }
  return { width, height };
}

/** Clasifica la transición mirando el brillo alrededor del corte */
function classifyTransition(t: number, luma: number[], rate: number): Transition {
  if (!luma.length) return "cut";
  const at = (s: number) => luma[Math.min(luma.length - 1, Math.max(0, Math.round(s * rate)))];
  const around: number[] = [];
  for (let d = -0.4; d <= 0.4; d += 1 / rate) around.push(at(t + d));
  const max = Math.max(...around);
  const min = Math.min(...around);
  const before = at(t - 0.6);
  const after = at(t + 0.6);
  // Flash: el brillo sube y vuelve a bajar alrededor del corte
  if (max > 200 && max - before > 40 && max - after > 40) return "flash";
  if (min < 20 && (before + after) / 2 - min > 40) return "fade";
  return "cut";
}

function avgLuma(start: number, end: number, luma: number[], rate: number): number {
  const a = Math.max(0, Math.floor(start * rate));
  const b = Math.min(luma.length, Math.ceil(end * rate));
  if (b <= a) return 128;
  let s = 0;
  for (let i = a; i < b; i++) s += luma[i];
  return s / (b - a);
}

/**
 * Convierte el análisis del video de referencia en una línea de tiempo:
 * cortes alineados al golpe más cercano, segmentos largos divididos al
 * ritmo y una transición + movimiento por segmento.
 */
export function toSpec(input: SpecInput): TemplateSpec {
  const { duration } = input;
  let cuts = input.cuts.filter((c) => c > MIN_SEGMENT && c < duration - MIN_SEGMENT);

  // Sin cortes visibles (un solo plano): se corta al ritmo o cada ~1.5 s
  if (cuts.length === 0) {
    const step = input.bpm ? (60 / input.bpm) * Math.max(1, Math.round(1.5 / (60 / input.bpm))) : 1.5;
    for (let t = step; t < duration - MIN_SEGMENT; t += step) cuts.push(t);
  }

  cuts = cuts.map((c) => {
    const n = nearest(input.onsets, c);
    return n !== null && Math.abs(n - c) <= SNAP_WINDOW ? n : c;
  });

  // Divide segmentos demasiado largos para que las fotos no se queden quietas
  const bounds = [...cuts.sort((a, b) => a - b), duration];
  const edges: number[] = [0];
  for (const b of bounds) {
    const a = edges[edges.length - 1];
    if (b - a > MAX_SEGMENT) {
      // Primero se intenta cortar en golpes de la música; si no hay, cada 2.5 s
      let cursor = a;
      for (const o of input.onsets) {
        if (o > cursor + 2 && o < b - 1.5) {
          edges.push(o);
          cursor = o;
        }
      }
      if (cursor === a) for (let t = a + 2.5; t < b - 1; t += 2.5) edges.push(t);
    }
    const prev = edges[edges.length - 1];
    if (b - prev >= MIN_SEGMENT) edges.push(b);
    else if (b === duration) edges[edges.length - 1] = b; // el último límite siempre es el final
  }

  const segments: SpecSegment[] = [];
  let fadeNext = false;
  for (let i = 0; i < edges.length - 1 && segments.length < MAX_SEGMENTS; i++) {
    const start = edges[i];
    const end = edges[i + 1];
    if (end - start < 0.05) continue;
    const prev = segments[segments.length - 1];
    // Un tramo corto casi negro es un fundido: se une al anterior y el siguiente entra con fundido
    if (prev && end - start < 1 && avgLuma(start, end, input.luma, input.lumaRate) < 20) {
      prev.duration = Number((end - prev.start).toFixed(3));
      fadeNext = true;
      continue;
    }
    const segDuration = end - start;
    segments.push({
      start,
      duration: Number(segDuration.toFixed(3)),
      transition: i === 0 || fadeNext ? "fade" : classifyTransition(start, input.luma, input.lumaRate),
      motion: segDuration < 0.5 ? "still" : MOTIONS[segments.length % MOTIONS.length],
    });
    fadeNext = false;
  }
  const last = segments[segments.length - 1];
  const total = last ? last.start + last.duration : duration;

  return {
    ...normalizeSize(input.width, input.height),
    fps: 30,
    duration: Number(total.toFixed(3)),
    bpm: input.bpm,
    audio: input.audio,
    segments,
  };
}

import "server-only";
import path from "node:path";
import { FFMPEG, FFPROBE, run, runBuffer } from "../server/exec";
import { MEDIA_DIR, mediaName } from "../server/storage";

export interface ProbeInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
}

export interface Analysis {
  probe: ProbeInfo;
  /** Segundos donde cambia la escena */
  cuts: number[];
  /** Picos de energía del audio (≈ golpes de la música) */
  onsets: number[];
  bpm: number | null;
  /** Luminancia media (0-255) muestreada a LUMA_RATE por segundo */
  luma: number[];
}

export const LUMA_RATE = 10;
const AUDIO_RATE = 11025;
const HOP = 256;
const WIN = 512;

export async function probe(file: string): Promise<ProbeInfo> {
  const { stdout } = await run(FFPROBE, [
    "-v", "error", "-print_format", "json", "-show_streams", "-show_format", file,
  ]);
  const info = JSON.parse(stdout) as {
    streams: Array<{
      codec_type: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      tags?: { rotate?: string };
      side_data_list?: Array<{ rotation?: number }>;
    }>;
    format: { duration?: string };
  };
  const video = info.streams.find((s) => s.codec_type === "video");
  if (!video?.width || !video.height) throw new Error("El archivo no tiene video");
  const rotation = Math.abs(Number(video.tags?.rotate ?? video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0));
  const rotated = rotation === 90 || rotation === 270;
  const [n, d] = (video.avg_frame_rate ?? "30/1").split("/").map(Number);
  return {
    duration: Number(info.format.duration ?? 0),
    width: rotated ? video.height : video.width,
    height: rotated ? video.width : video.height,
    fps: d ? n / d : 30,
    hasAudio: info.streams.some((s) => s.codec_type === "audio"),
  };
}

/** Cortes de escena con el filtro "scene" de ffmpeg */
export async function detectCuts(file: string, threshold = 0.3): Promise<number[]> {
  const { stderr } = await run(FFMPEG, [
    "-hide_banner", "-i", file, "-an",
    "-vf", `select='gt(scene,${threshold})',showinfo`,
    "-f", "null", "-",
  ]);
  const cuts: number[] = [];
  for (const m of stderr.matchAll(/pts_time:([0-9.]+)/g)) cuts.push(Number(m[1]));
  return cuts;
}

/** Brillo medio por cuadro (muestreado) para detectar flashes y fundidos a negro */
export async function lumaTimeline(file: string): Promise<number[]> {
  const buf = await runBuffer(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-i", file, "-an",
    "-vf", `fps=${LUMA_RATE},scale=16:16,format=gray`,
    "-f", "rawvideo", "-",
  ]);
  const out: number[] = [];
  for (let i = 0; i + 256 <= buf.length; i += 256) {
    let s = 0;
    for (let j = 0; j < 256; j++) s += buf[i + j];
    out.push(s / 256);
  }
  return out;
}

/**
 * Detección de golpes: envolvente de energía (flujo positivo de energía
 * logarítmica) + selección de picos con umbral adaptativo. El tempo se
 * estima por autocorrelación de esa envolvente entre 60 y 180 BPM.
 */
export async function detectBeats(file: string): Promise<{ onsets: number[]; bpm: number | null }> {
  const pcm = await runBuffer(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-i", file, "-vn",
    "-ac", "1", "-ar", String(AUDIO_RATE), "-f", "s16le", "-",
  ]);
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const frames = Math.floor((samples.length - WIN) / HOP);
  if (frames < 20) return { onsets: [], bpm: null };

  const energy = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    for (let i = 0; i < WIN; i++) {
      const v = samples[f * HOP + i] / 32768;
      s += v * v;
    }
    energy[f] = Math.log(1e-6 + s / WIN);
  }
  const flux = new Float64Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, energy[f] - energy[f - 1]);

  const frameSec = HOP / AUDIO_RATE;
  const half = Math.round(0.5 / frameSec);
  const minGap = Math.round(0.18 / frameSec);
  const onsets: number[] = [];
  let last = -minGap;
  for (let f = 1; f < frames - 1; f++) {
    if (flux[f] <= flux[f - 1] || flux[f] < flux[f + 1]) continue;
    let sum = 0;
    let sq = 0;
    let n = 0;
    for (let k = Math.max(0, f - half); k < Math.min(frames, f + half); k++) {
      sum += flux[k];
      sq += flux[k] * flux[k];
      n++;
    }
    const mean = sum / n;
    const std = Math.sqrt(Math.max(0, sq / n - mean * mean));
    if (flux[f] > mean + 1.2 * std && flux[f] > 0.15 && f - last >= minGap) {
      onsets.push(Number((f * frameSec).toFixed(3)));
      last = f;
    }
  }

  // Tempo por autocorrelación
  const minLag = Math.round(60 / 180 / frameSec);
  const maxLag = Math.round(60 / 60 / frameSec);
  let bestLag = 0;
  let best = 0;
  for (let lag = minLag; lag <= maxLag && lag < frames; lag++) {
    let s = 0;
    for (let f = lag; f < frames; f++) s += flux[f] * flux[f - lag];
    // Ligera preferencia por tempos cercanos a 120 BPM para evitar dobles/mitades
    const bpm = 60 / (lag * frameSec);
    const weight = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120), 2));
    if (s * weight > best) {
      best = s * weight;
      bestLag = lag;
    }
  }
  const bpm = bestLag ? Math.round(60 / (bestLag * frameSec)) : null;
  return { onsets, bpm };
}

export async function analyzeVideo(file: string): Promise<Analysis> {
  const info = await probe(file);
  const [cuts, luma, beats] = await Promise.all([
    detectCuts(file),
    lumaTimeline(file),
    info.hasAudio ? detectBeats(file) : Promise.resolve({ onsets: [], bpm: null }),
  ]);
  return { probe: info, cuts, luma, onsets: beats.onsets, bpm: beats.bpm };
}

/** Un fotograma JPG por segmento (en su punto medio) para mostrarlo en la UI */
export async function extractFrames(file: string, times: number[]): Promise<string[]> {
  const names: string[] = [];
  for (const t of times) {
    const name = mediaName("jpg");
    await run(FFMPEG, [
      "-hide_banner", "-loglevel", "error", "-ss", t.toFixed(3), "-i", file,
      "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", path.join(MEDIA_DIR, name),
    ]);
    names.push(name);
  }
  return names;
}

/** Extrae la pista de audio para poder reutilizarla en el video nuevo */
export async function extractAudio(file: string): Promise<string> {
  const name = mediaName("m4a");
  await run(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-i", file, "-vn",
    "-ac", "2", "-c:a", "aac", "-b:a", "160k", path.join(MEDIA_DIR, name),
  ]);
  return name;
}

import "server-only";
import fs from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { TemplateSpec } from "../types";
import { mediaPath } from "../server/storage";

const MAX_FRAMES = 12;

const StyleSchema = z.object({
  description: z.string().describe("Descripción breve del estilo del video, en español"),
  segments: z.array(
    z.object({
      index: z.number().int(),
      transition: z.enum(["cut", "fade", "slide", "zoom", "flash"]),
      motion: z.enum(["zoom-in", "zoom-out", "pan-left", "pan-right", "still"]),
    }),
  ),
});

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Opcional (de pago por uso): envía algunos fotogramas a la API de Claude
 * para afinar transiciones y movimientos y describir el estilo.
 * Solo se llama si el usuario lo pide explícitamente desde la UI.
 */
export async function refineWithAI(spec: TemplateSpec, frames: string[]): Promise<{ spec: TemplateSpec; notes: string }> {
  const client = new Anthropic();
  const step = Math.max(1, Math.ceil(frames.length / MAX_FRAMES));
  const picked = frames.map((f, i) => ({ f, i })).filter((_, i) => i % step === 0).slice(0, MAX_FRAMES);

  const content: Anthropic.ContentBlockParam[] = [];
  for (const { f, i } of picked) {
    const data = (await fs.readFile(mediaPath(f))).toString("base64");
    content.push({ type: "text", text: `Segmento ${i}: inicia en ${spec.segments[i]?.start ?? 0}s, dura ${spec.segments[i]?.duration ?? 0}s` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  }
  content.push({
    type: "text",
    text:
      `Estos son fotogramas de un video corto (${spec.duration}s, ${spec.segments.length} segmentos, ` +
      `${spec.bpm ?? "?"} BPM). Voy a recrear su estilo con fotos fijas. Para cada segmento mostrado ` +
      `(usa su índice) sugiere la transición de entrada y el movimiento de cámara que mejor imiten el original, ` +
      `y describe el estilo general en 1-2 frases en español.`,
  });

  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(StyleSchema) },
    messages: [{ role: "user", content }],
  });

  const parsed = response.parsed_output;
  if (response.stop_reason === "refusal" || !parsed) {
    throw new Error("La IA no devolvió una sugerencia válida");
  }

  // Solo cambia los segmentos que la IA vio; el resto conserva el análisis automático
  const byIndex = new Map(parsed.segments.map((s) => [s.index, s]));
  const segments = spec.segments.map((seg, i) => {
    const s = byIndex.get(i);
    return s ? { ...seg, transition: s.transition, motion: s.motion } : seg;
  });
  return { spec: { ...spec, segments }, notes: parsed.description };
}

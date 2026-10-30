import type { Aspect } from "../../lib/types";

export const FPS = 30;
export const TRANSITION_FRAMES = 15;
export const INTRO_SECONDS = 3;
export const OUTRO_SECONDS = 4;

export const DIMENSIONS: Record<Aspect, { width: number; height: number }> = {
  vertical: { width: 1080, height: 1920 },
  cuadrado: { width: 1080, height: 1080 },
  horizontal: { width: 1920, height: 1080 },
};

/** Duración total de las plantillas con intro + fotos + cierre */
export function slideshowDuration(photoCount: number, secondsPerPhoto: number): number {
  const scenes = [INTRO_SECONDS * FPS, ...Array(Math.max(photoCount, 1)).fill(Math.round(secondsPerPhoto * FPS)), OUTRO_SECONDS * FPS];
  const sum = scenes.reduce((a, b) => a + b, 0);
  return sum - (scenes.length - 1) * TRANSITION_FRAMES;
}

/** Tamaño, fps y duración de un video según plantilla y props (lo usan el Player y el render) */
export function videoMeta(
  template: "clasica" | "romantica" | "fiesta" | "replica",
  props: { aspect: Aspect; photos: string[]; secondsPerPhoto: number; spec?: { width: number; height: number; duration: number } | null },
): { width: number; height: number; fps: number; durationInFrames: number } {
  if (template === "replica") {
    const spec = props.spec;
    if (!spec) return { ...DIMENSIONS[props.aspect], fps: FPS, durationInFrames: FPS * 5 };
    return { width: spec.width, height: spec.height, fps: FPS, durationInFrames: Math.max(1, Math.round(spec.duration * FPS)) };
  }
  return {
    ...DIMENSIONS[props.aspect],
    fps: FPS,
    durationInFrames: slideshowDuration(props.photos.length, props.secondsPerPhoto),
  };
}

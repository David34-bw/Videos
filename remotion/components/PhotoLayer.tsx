import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Motion } from "../../lib/types";

/**
 * Foto a pantalla completa con movimiento suave (efecto Ken Burns) sobre
 * un fondo desenfocado de la misma imagen, para que fotos horizontales
 * se vean bien en formato vertical y viceversa.
 */
export const PhotoLayer: React.FC<{ src: string; motion: Motion; fit?: "cover" | "contain" }> = ({
  src,
  motion,
  fit = "contain",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let transform = "none";
  if (motion === "zoom-in") transform = `scale(${1 + 0.12 * t})`;
  if (motion === "zoom-out") transform = `scale(${1.12 - 0.12 * t})`;
  if (motion === "pan-left") transform = `scale(1.12) translateX(${4 - 8 * t}%)`;
  if (motion === "pan-right") transform = `scale(1.12) translateX(${-4 + 8 * t}%)`;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <Img
        src={src}
        style={{
          position: "absolute",
          inset: -40,
          width: "calc(100% + 80px)",
          height: "calc(100% + 80px)",
          objectFit: "cover",
          filter: "blur(40px) brightness(0.6)",
        }}
      />
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit,
          transform,
        }}
      />
    </AbsoluteFill>
  );
};

export const MOTIONS: Motion[] = ["zoom-in", "pan-left", "zoom-out", "pan-right"];

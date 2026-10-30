import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** Texto que entra con un rebote suave y se desvanece al final de su secuencia */
export const AnimatedText: React.FC<{
  text: string;
  size: number;
  color: string;
  delay?: number;
  font?: string;
  weight?: number;
  shadow?: boolean;
}> = ({ text, size, color, delay = 0, font = "system-ui, sans-serif", weight = 800, shadow = true }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.6 } });
  const exit = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (!text) return null;
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        color,
        textAlign: "center",
        lineHeight: 1.15,
        padding: "0 6%",
        opacity: Math.min(enter, exit),
        transform: `translateY(${(1 - enter) * 40}px) scale(${0.9 + 0.1 * enter})`,
        textShadow: shadow ? "0 6px 24px rgba(0,0,0,0.55)" : undefined,
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </div>
  );
};

import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";

const Heart: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      fill={color}
      d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4.5 6 4.5c2.2 0 3.6 1.3 4.5 2.6.3.5 1 .5 1.3 0 .9-1.3 2.3-2.6 4.5-2.6 3.7 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z"
    />
  </svg>
);

/**
 * Partículas deterministas (iguales en preview y render):
 * corazones que suben o confeti que cae.
 */
export const Particles: React.FC<{ kind: "hearts" | "confetti"; colors: string[]; count?: number }> = ({
  kind,
  colors,
  count = 28,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => {
        const seed = `p-${kind}-${i}`;
        const x = random(seed + "x") * width;
        const speed = 0.4 + random(seed + "s") * 0.8;
        const size = (kind === "hearts" ? 30 : 14) + random(seed + "z") * (kind === "hearts" ? 40 : 18);
        const phase = random(seed + "p") * height;
        const travel = ((frame / fps) * 220 * speed + phase) % (height + 200);
        const y = kind === "hearts" ? height + 100 - travel : travel - 100;
        const sway = Math.sin(frame / 20 + i) * 30;
        const rot = kind === "confetti" ? frame * 4 * speed + i * 40 : Math.sin(frame / 15 + i) * 15;
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + sway,
              top: y,
              transform: `rotate(${rot}deg)`,
              opacity: 0.85,
            }}
          >
            {kind === "hearts" ? (
              <Heart size={size} color={color} />
            ) : (
              <div style={{ width: size, height: size * 0.45, backgroundColor: color, borderRadius: 2 }} />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SpecSegment, VideoProps } from "../../lib/types";
import { AnimatedText } from "../components/AnimatedText";
import { PhotoLayer } from "../components/PhotoLayer";
import { mediaSrc } from "../components/mediaSrc";
import { fadeVolume } from "./Slideshow";

const ENTER_FRAMES = 8;

/** Entrada de cada segmento según la transición detectada en el video de referencia */
const SegmentScene: React.FC<{ segment: SpecSegment; src: string; color: string; textColor: string }> = ({
  segment,
  src,
  color,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const p = interpolate(frame, [0, ENTER_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  let style: React.CSSProperties = {};
  if (segment.transition === "fade") style = { opacity: p };
  if (segment.transition === "slide") style = { transform: `translateX(${(1 - p) * 100}%)` };
  if (segment.transition === "zoom") style = { transform: `scale(${1.35 - 0.35 * p})` };

  const flash = segment.transition === "flash" ? 1 - p : 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={style}>
        <PhotoLayer src={src} motion={segment.motion} />
      </AbsoluteFill>
      {flash > 0 ? <AbsoluteFill style={{ backgroundColor: "#fff", opacity: flash }} /> : null}
      {segment.text ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: "18%" }}>
          <div style={{ backgroundColor: `${color}cc`, borderRadius: 24, padding: "18px 10px" }}>
            <AnimatedText text={segment.text} size={width * 0.06} color={textColor} delay={2} />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Recrea la línea de tiempo de un video de referencia (cortes al ritmo,
 * transiciones y movimientos) usando las fotos elegidas.
 */
export const Replica: React.FC<VideoProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const spec = props.spec;
  if (!spec || spec.segments.length === 0 || props.photos.length === 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#111", color: "#fff", justifyContent: "center", alignItems: "center", fontSize: 48 }}>
        Falta la plantilla o las fotos
      </AbsoluteFill>
    );
  }
  const photos = props.photos.map(mediaSrc);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {spec.segments.map((seg, i) => {
        const from = Math.round(seg.start * fps);
        const next = spec.segments[i + 1];
        const end = next ? Math.round(next.start * fps) : durationInFrames;
        // Se extiende unos frames para que la entrada del siguiente segmento se superponga
        const overlap = next && next.transition !== "cut" ? ENTER_FRAMES : 0;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, end - from + overlap)} layout="none">
            <AbsoluteFill style={{ zIndex: i }}>
              <SegmentScene
                segment={seg}
                src={photos[i % photos.length]}
                color={props.colors.primary}
                textColor={props.colors.text}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      {props.music ?? spec.audio ? (
        <Html5Audio src={mediaSrc((props.music ?? spec.audio) as string)} volume={(f) => fadeVolume(f, durationInFrames)} />
      ) : null}
    </AbsoluteFill>
  );
};

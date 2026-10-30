import React from "react";
import { AbsoluteFill, Html5Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming, type TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import type { VideoProps } from "../../lib/types";
import { AnimatedText } from "../components/AnimatedText";
import { Particles } from "../components/Particles";
import { MOTIONS, PhotoLayer } from "../components/PhotoLayer";
import { FPS, INTRO_SECONDS, OUTRO_SECONDS, TRANSITION_FRAMES } from "../components/media";
import { mediaSrc } from "../components/mediaSrc";

export type Variant = "clasica" | "romantica" | "fiesta";

const FONTS: Record<Variant, string> = {
  clasica: "Georgia, 'Times New Roman', serif",
  romantica: "'Brush Script MT', 'Segoe Script', Georgia, serif",
  fiesta: "'Arial Black', Impact, system-ui, sans-serif",
};

/** Pantalla de texto con degradado de la ocasión */
const TextCard: React.FC<{
  title: string;
  subtitle: string;
  props: VideoProps;
  variant: Variant;
  background?: string;
}> = ({ title, subtitle, props, variant, background }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const { primary, secondary, text } = props.colors;
  const angle = interpolate(frame, [0, 150], [120, 160]);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${primary}, ${secondary})`,
        justifyContent: "center",
        alignItems: "center",
        gap: 30,
      }}
    >
      {background ? (
        <AbsoluteFill style={{ opacity: 0.35 }}>
          <PhotoLayer src={background} motion="zoom-in" fit="cover" />
        </AbsoluteFill>
      ) : null}
      {variant !== "clasica" ? (
        <Particles kind={variant === "romantica" ? "hearts" : "confetti"} colors={[text, secondary, primary]} />
      ) : null}
      <AnimatedText text={title} size={width * 0.085} color={text} font={FONTS[variant]} />
      <AnimatedText text={subtitle} size={width * 0.045} color={text} delay={10} weight={500} font={FONTS.clasica} />
    </AbsoluteFill>
  );
};

/** Foto con un leve marco/viñeta según la variante */
const PhotoScene: React.FC<{ src: string; index: number; props: VideoProps; variant: Variant }> = ({
  src,
  index,
  props,
  variant,
}) => (
  <AbsoluteFill>
    <PhotoLayer src={src} motion={MOTIONS[index % MOTIONS.length]} />
    <AbsoluteFill
      style={{
        background:
          variant === "romantica"
            ? `radial-gradient(ellipse at center, transparent 55%, ${props.colors.primary}88 100%)`
            : "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.45) 100%)",
      }}
    />
    {variant === "romantica" ? <Particles kind="hearts" colors={[props.colors.secondary, "#ffffff"]} count={10} /> : null}
  </AbsoluteFill>
);

type AnyPresentation = TransitionPresentation<Record<string, unknown>>;

function transitionFor(variant: Variant, i: number, width: number, height: number): AnyPresentation {
  const fromDirs = ["from-left", "from-right", "from-bottom", "from-top"] as const;
  if (variant === "clasica") return fade() as AnyPresentation;
  if (variant === "romantica") {
    return (i % 3 === 2 ? clockWipe({ width, height }) : fade()) as AnyPresentation;
  }
  return (i % 2 === 0
    ? slide({ direction: fromDirs[i % 4] })
    : wipe({ direction: fromDirs[(i + 1) % 4] })) as AnyPresentation;
}

export const Slideshow: React.FC<VideoProps & { variant: Variant }> = ({ variant, ...props }) => {
  const { width, height, durationInFrames } = useVideoConfig();
  const photos = props.photos.map(mediaSrc);
  const perPhoto = Math.round(props.secondsPerPhoto * FPS);
  const timing = linearTiming({ durationInFrames: TRANSITION_FRAMES });
  const t = (i: number) => transitionFor(variant, i, width, height);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={INTRO_SECONDS * FPS}>
          <TextCard title={props.title} subtitle={props.subtitle} props={props} variant={variant} background={photos[0]} />
        </TransitionSeries.Sequence>
        {photos.flatMap((src, i) => [
          <TransitionSeries.Transition key={`t${i}`} presentation={t(i)} timing={timing} />,
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={perPhoto}>
            <PhotoScene src={src} index={i} props={props} variant={variant} />
          </TransitionSeries.Sequence>,
        ])}
        <TransitionSeries.Transition presentation={fade() as AnyPresentation} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={OUTRO_SECONDS * FPS}>
          <TextCard title={props.message} subtitle="" props={props} variant={variant} background={photos[photos.length - 1]} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {props.music ? <Html5Audio src={mediaSrc(props.music)} volume={(f) => fadeVolume(f, durationInFrames)} /> : null}
    </AbsoluteFill>
  );
};

/** Sube el volumen al inicio y lo baja al final */
export function fadeVolume(frame: number, total: number): number {
  return interpolate(frame, [0, 20, total - 60, total], [0, 0.9, 0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

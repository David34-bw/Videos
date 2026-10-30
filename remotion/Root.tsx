import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import type { VideoProps } from "../lib/types";
import { FPS, videoMeta } from "./components/media";
import { Slideshow } from "./templates/Slideshow";
import { Replica } from "./templates/Replica";

const SAMPLE = [
  "https://picsum.photos/id/1011/1080/1350",
  "https://picsum.photos/id/1025/1080/1350",
  "https://picsum.photos/id/1035/1350/1080",
];

export const defaultProps: VideoProps = {
  photos: SAMPLE,
  title: "¡Feliz cumpleaños!",
  subtitle: "Con todo mi cariño",
  message: "Te quiero mucho",
  aspect: "vertical",
  colors: { primary: "#ff7a59", secondary: "#ffd166", text: "#ffffff" },
  music: null,
  secondsPerPhoto: 3,
  spec: null,
};

const slideshowMeta: CalculateMetadataFunction<VideoProps> = ({ props }) => videoMeta("clasica", props);
const replicaMeta: CalculateMetadataFunction<VideoProps> = ({ props }) => videoMeta("replica", props);

const Clasica: React.FC<VideoProps> = (p) => <Slideshow {...p} variant="clasica" />;
const Romantica: React.FC<VideoProps> = (p) => <Slideshow {...p} variant="romantica" />;
const Fiesta: React.FC<VideoProps> = (p) => <Slideshow {...p} variant="fiesta" />;

export const TEMPLATE_COMPONENTS = { clasica: Clasica, romantica: Romantica, fiesta: Fiesta, replica: Replica };

export const RemotionRoot: React.FC = () => (
  <>
    {(["clasica", "romantica", "fiesta"] as const).map((id) => (
      <Composition
        key={id}
        id={id}
        component={TEMPLATE_COMPONENTS[id]}
        defaultProps={defaultProps}
        calculateMetadata={slideshowMeta}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={300}
      />
    ))}
    <Composition
      id="replica"
      component={Replica}
      defaultProps={defaultProps}
      calculateMetadata={replicaMeta}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={150}
    />
  </>
);

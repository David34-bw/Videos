"use client";
import { Player } from "@remotion/player";
import type { TemplateId, VideoProps } from "@/lib/types";
import { TEMPLATE_COMPONENTS } from "@/remotion/Root";
import { videoMeta } from "@/remotion/components/media";

export function VideoPreview({ template, props }: { template: TemplateId; props: VideoProps }) {
  const meta = videoMeta(template, props);
  return (
    <Player
      component={TEMPLATE_COMPONENTS[template]}
      inputProps={props}
      durationInFrames={meta.durationInFrames}
      compositionWidth={meta.width}
      compositionHeight={meta.height}
      fps={meta.fps}
      controls
      loop
      acknowledgeRemotionLicense
      style={{ width: "100%", maxHeight: "70vh", aspectRatio: `${meta.width} / ${meta.height}`, borderRadius: 12 }}
    />
  );
}

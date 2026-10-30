import { NextResponse, type NextRequest } from "next/server";
import { startRender } from "@/lib/server/render";
import { MEDIA_NAME_RE, getDb } from "@/lib/server/storage";
import { errorMessage, jsonError } from "@/lib/server/http";
import type { Aspect, TemplateId, VideoProps } from "@/lib/types";

const TEMPLATES: TemplateId[] = ["clasica", "romantica", "fiesta", "replica"];
const ASPECTS: Aspect[] = ["vertical", "cuadrado", "horizontal"];
const COLOR_RE = /^#[0-9a-f]{3,8}$/i;
const MUSIC_RE = /^\/music\/[^/]+$/;

function text(v: unknown, max = 120): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export async function GET() {
  return NextResponse.json({ renders: (await getDb()).renders });
}

/** Valida las props (solo archivos locales conocidos, nada de URLs externas) y lanza el render */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      template?: string;
      props?: Partial<VideoProps>;
      referenceId?: string;
      /** Textos por escena de la réplica (sobrescriben los guardados) */
      segmentTexts?: unknown[];
    };
    const template = body.template as TemplateId;
    if (!TEMPLATES.includes(template)) return jsonError("Plantilla inválida");
    const p = body.props ?? {};
    const photos = (p.photos ?? []).map((x) => String(x).replace(/^\/api\/media\//, "")).filter((x) => MEDIA_NAME_RE.test(x));
    if (photos.length === 0) return jsonError("Elige al menos una foto");
    const music = typeof p.music === "string" ? p.music.replace(/^\/api\/media\//, "") : null;

    let spec = null;
    if (template === "replica") {
      const ref = (await getDb()).references.find((r) => r.id === body.referenceId);
      if (!ref) return jsonError("Elige un video de referencia");
      const texts = Array.isArray(body.segmentTexts) ? body.segmentTexts : null;
      spec = {
        ...ref.spec,
        segments: ref.spec.segments.map((seg, i) => ({
          ...seg,
          text: texts ? text(texts[i]) || undefined : seg.text,
        })),
      };
    }
    const colors = p.colors ?? { primary: "#264653", secondary: "#e9c46a", text: "#ffffff" };
    const props: VideoProps = {
      photos: photos.slice(0, 80),
      title: text(p.title),
      subtitle: text(p.subtitle),
      message: text(p.message, 200),
      aspect: ASPECTS.includes(p.aspect as Aspect) ? (p.aspect as Aspect) : "vertical",
      colors: {
        primary: COLOR_RE.test(colors.primary) ? colors.primary : "#264653",
        secondary: COLOR_RE.test(colors.secondary) ? colors.secondary : "#e9c46a",
        text: COLOR_RE.test(colors.text) ? colors.text : "#ffffff",
      },
      music: music && (MEDIA_NAME_RE.test(music) || MUSIC_RE.test(music)) ? music : null,
      secondsPerPhoto: Math.min(8, Math.max(1, Number(p.secondsPerPhoto) || 3)),
      spec,
    };
    const job = await startRender(template, props);
    return NextResponse.json({ job });
  } catch (e) {
    return jsonError(errorMessage(e), 500);
  }
}

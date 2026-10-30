"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Reference } from "@/lib/types";
import { mediaSrc } from "@/remotion/components/mediaSrc";
import { api } from "@/components/api";
import { useStatus } from "@/components/useStatus";

export default function ReferencesPage() {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const status = useStatus();

  useEffect(() => {
    api<{ references: Reference[] }>("/api/references").then((d) => setRefs(d.references));
  }, []);

  async function submit(body: FormData | string) {
    setBusy(true);
    setError("");
    try {
      const { reference } = await api<{ reference: Reference }>("/api/references", { method: "POST", body });
      setRefs((r) => [reference, ...r]);
      setUrl("");
      setName("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function uploadFile(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    form.append("name", name || f.name.replace(/\.[^.]+$/, ""));
    void submit(form);
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Plantillas desde reels</h1>
        <p className="muted">
          Sube un video que te guste (o pega el link de un reel) y la app detecta sus cortes, su ritmo y sus
          transiciones para recrearlo con tus fotos.
        </p>
      </section>

      <section className="card space-y-3">
        <div>
          <label className="label">Nombre de la plantilla (opcional)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Reel aniversario" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={busy || status?.ffmpeg === false} onClick={() => fileInput.current?.click()}>
            Subir video
          </button>
          <input ref={fileInput} type="file" accept="video/*" hidden onChange={(e) => uploadFile(e.target.files)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/…"
          />
          <button
            className="btn btn-ghost"
            disabled={busy || !url || status?.ytdlp === false}
            onClick={() => submit(JSON.stringify({ url, name: name || undefined }))}
          >
            Usar link
          </button>
        </div>
        {status && !status.ytdlp ? (
          <p className="muted text-sm">
            Para usar links instala <code>yt-dlp</code> (ver README). Mientras tanto, descarga el reel y súbelo como
            archivo.
          </p>
        ) : null}
        {status && !status.ffmpeg ? <p className="text-sm text-red-500">Instala ffmpeg para analizar videos.</p> : null}
        <p className="muted text-xs">
          Solo para uso personal: el video se analiza en tu computador y no se guarda; se conservan fotogramas de
          muestra y la pista de audio. Respeta los derechos de autor si publicas el resultado.
        </p>
        {busy ? <p className="text-sm">Analizando video… puede tardar un minuto.</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {refs.map((r) => (
          <Link key={r.id} href={`/referencias/${r.id}`} className="card flex gap-3 hover:shadow">
            <div className="flex w-24 shrink-0 gap-0.5 overflow-hidden rounded-lg">
              {r.frames.slice(0, 3).map((f) => (
                <img key={f} src={mediaSrc(f)} alt="" className="h-24 w-8 object-cover" />
              ))}
            </div>
            <div>
              <p className="font-semibold">{r.name}</p>
              <p className="muted text-sm">
                {r.spec.duration.toFixed(1)} s · {r.spec.segments.length} escenas
                {r.spec.bpm ? ` · ${r.spec.bpm} BPM` : ""}
              </p>
              <p className="muted text-xs">Necesita ~{r.spec.segments.length} fotos</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

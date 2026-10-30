"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { OCCASIONS, fillText, parseYmd, textVars, type OccasionId } from "@/lib/occasions";
import type { Aspect, Person, Reference, RenderJob, TemplateId, VideoProps } from "@/lib/types";
import { mediaSrc } from "@/remotion/components/mediaSrc";
import { api } from "@/components/api";
import { useStatus } from "@/components/useStatus";

const VideoPreview = dynamic(() => import("@/components/VideoPreview").then((m) => m.VideoPreview), {
  ssr: false,
  loading: () => <div className="muted">Cargando vista previa…</div>,
});

const TEMPLATES: Record<TemplateId, string> = {
  clasica: "Clásica",
  romantica: "Romántica",
  fiesta: "Fiesta",
  replica: "Copiar un reel",
};

const ASPECTS: Record<Aspect, string> = {
  vertical: "Vertical 9:16 (historias, reels)",
  cuadrado: "Cuadrado 1:1",
  horizontal: "Horizontal 16:9",
};

interface Track {
  name: string;
  src: string;
}

function Wizard() {
  const search = useSearchParams();
  const { data: session } = useSession();
  const status = useStatus();

  const [people, setPeople] = useState<Person[]>([]);
  const [refs, setRefs] = useState<Reference[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);

  const [personId, setPersonId] = useState(search.get("persona") ?? "");
  const [occasion, setOccasion] = useState<OccasionId>((search.get("ocasion") as OccasionId) ?? "cumpleanos");
  const [template, setTemplate] = useState<TemplateId>((search.get("plantilla") as TemplateId) ?? OCCASIONS[occasion]?.template ?? "clasica");
  const [referenceId, setReferenceId] = useState(search.get("referencia") ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [message, setMessage] = useState("");
  const [aspect, setAspect] = useState<Aspect>("vertical");
  const [secondsPerPhoto, setSecondsPerPhoto] = useState(3);
  const [music, setMusic] = useState<string>("");
  const [colors, setColors] = useState(OCCASIONS[occasion]?.colors ?? OCCASIONS.personalizado.colors);
  const [textsOnReplica, setTextsOnReplica] = useState(true);

  const [job, setJob] = useState<RenderJob | null>(null);
  const [error, setError] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const musicInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ people: Person[] }>("/api/people").then((d) => setPeople(d.people));
    api<{ references: Reference[] }>("/api/references").then((d) => setRefs(d.references));
    api<{ tracks: Track[] }>("/api/music").then((d) => setTracks(d.tracks));
  }, []);

  const person = people.find((p) => p.id === personId);
  const reference = refs.find((r) => r.id === referenceId);

  // Variables para los textos ({nombre}, {edad}, {meses}, {anios})
  const fecha = search.get("fecha");
  const vars = useMemo(() => {
    if (!person) return { nombre: "" };
    return textVars(person, fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? parseYmd(fecha) : new Date());
  }, [person, fecha]);

  // Al cambiar de persona: selecciona todas sus fotos
  useEffect(() => {
    if (person) setSelected(person.photos.map((p) => p.file));
  }, [person]);

  // Al cambiar de ocasión o persona: textos y colores sugeridos
  useEffect(() => {
    const occ = OCCASIONS[occasion];
    if (!occ) return;
    setTitle(fillText(occ.title, vars));
    setSubtitle(fillText(occ.subtitle, vars));
    setMessage(fillText(occ.message, vars));
    setColors(occ.colors);
  }, [occasion, vars]);

  // La plantilla réplica usa el audio del reel por defecto
  useEffect(() => {
    if (template === "replica" && reference?.spec.audio) setMusic(reference.spec.audio);
  }, [template, reference]);

  const spec = useMemo(() => {
    if (template !== "replica" || !reference) return null;
    if (!textsOnReplica) return reference.spec;
    const segs = reference.spec.segments.map((s) => ({ ...s }));
    if (segs[0] && !segs[0].text) segs[0].text = title;
    const last = segs[segs.length - 1];
    if (segs.length > 1 && last && !last.text) last.text = message;
    return { ...reference.spec, segments: segs };
  }, [template, reference, textsOnReplica, title, message]);

  const props: VideoProps = {
    photos: selected,
    title,
    subtitle,
    message,
    aspect,
    colors,
    music: music || null,
    secondsPerPhoto,
    spec,
  };

  const togglePhoto = (file: string) =>
    setSelected((s) => (s.includes(file) ? s.filter((f) => f !== file) : [...s, file]));

  async function uploadMusic(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    try {
      const { track } = await api<{ track: Track }>("/api/music", { method: "POST", body: form });
      setTracks((t) => [...t, track]);
      setMusic(track.src);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function render() {
    setError("");
    setDriveUrl("");
    try {
      const { job: j } = await api<{ job: RenderJob }>("/api/render", {
        method: "POST",
        body: JSON.stringify({
          template,
          referenceId,
          props,
          segmentTexts: spec?.segments.map((s) => s.text ?? ""),
        }),
      });
      setJob(j);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Consulta el progreso del render
  useEffect(() => {
    if (!job || job.status === "done" || job.status === "error") return;
    const t = setInterval(async () => {
      const { job: j } = await api<{ job: RenderJob }>(`/api/render/${job.id}`);
      setJob(j);
    }, 1500);
    return () => clearInterval(t);
  }, [job]);

  async function saveToDrive() {
    if (!job) return;
    try {
      const name = `${OCCASIONS[occasion].label} - ${person?.name ?? ""}`.trim();
      const res = await api<{ url: string }>(`/api/render/${job.id}/drive`, {
        method: "POST",
        body: JSON.stringify({ name, folderId: person?.driveFolderId }),
      });
      setDriveUrl(res.url);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const canRender = selected.length > 0 && (template !== "replica" || reference);
  const rendering = job && (job.status === "queued" || job.status === "rendering");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Crear video</h1>

        <section className="card grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">1. Persona</label>
            <select className="input" value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">Elige…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">2. Ocasión</label>
            <select
              className="input"
              value={occasion}
              onChange={(e) => {
                const o = e.target.value as OccasionId;
                setOccasion(o);
                if (template !== "replica") setTemplate(OCCASIONS[o].template);
              }}
            >
              {Object.values(OCCASIONS).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.emoji} {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">3. Estilo</label>
            <select className="input" value={template} onChange={(e) => setTemplate(e.target.value as TemplateId)}>
              {Object.entries(TEMPLATES).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {template === "replica" ? (
            <div>
              <label className="label">Reel a copiar</label>
              <select className="input" value={referenceId} onChange={(e) => setReferenceId(e.target.value)}>
                <option value="">Elige…</option>
                {refs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.spec.segments.length} escenas)
                  </option>
                ))}
              </select>
              {refs.length === 0 ? (
                <a href="/referencias" className="text-sm text-[var(--accent)]">
                  Primero crea una plantilla desde un reel
                </a>
              ) : null}
            </div>
          ) : (
            <div>
              <label className="label">Formato</label>
              <select className="input" value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)}>
                {Object.entries(ASPECTS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {person ? (
          <section className="card space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="label">
                4. Fotos ({selected.length} elegidas, en este orden)
                {reference && template === "replica"
                  ? ` · el reel tiene ${reference.spec.segments.length} escenas${
                      selected.length < reference.spec.segments.length ? ", algunas fotos se repetirán" : ""
                    }`
                  : ""}
              </label>
              <div className="flex gap-2 text-sm">
                <button className="text-[var(--accent)]" onClick={() => setSelected(person.photos.map((p) => p.file))}>
                  Todas
                </button>
                <button className="muted" onClick={() => setSelected([])}>
                  Ninguna
                </button>
                <button className="muted" onClick={() => setSelected((s) => [...s].sort(() => Math.random() - 0.5))}>
                  Mezclar
                </button>
              </div>
            </div>
            {person.photos.length === 0 ? (
              <p className="muted text-sm">
                Esta persona no tiene fotos. <a className="text-[var(--accent)]" href={`/personas/${person.id}`}>Agrégalas aquí</a>.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {person.photos.map((ph) => {
                  const idx = selected.indexOf(ph.file);
                  return (
                    <button
                      key={ph.file}
                      onClick={() => togglePhoto(ph.file)}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                        idx >= 0 ? "border-[var(--accent)]" : "border-transparent opacity-50"
                      }`}
                    >
                      <img src={mediaSrc(ph.file)} alt={ph.name} className="h-full w-full object-cover" loading="lazy" />
                      {idx >= 0 ? (
                        <span className="absolute left-1 top-1 rounded-full bg-[var(--accent)] px-1.5 text-xs text-white">
                          {idx + 1}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        <section className="card grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">5. Título</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {template !== "replica" ? (
            <div className="sm:col-span-2">
              <label className="label">Subtítulo</label>
              <input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label className="label">Mensaje final</label>
            <textarea className="input" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          {template === "replica" ? (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={textsOnReplica} onChange={(e) => setTextsOnReplica(e.target.checked)} />
              Poner el título en la primera escena y el mensaje en la última (si no tienen texto)
            </label>
          ) : (
            <div>
              <label className="label">Segundos por foto: {secondsPerPhoto}</label>
              <input
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={secondsPerPhoto}
                onChange={(e) => setSecondsPerPhoto(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
          <div className="flex items-end gap-3">
            {(["primary", "secondary", "text"] as const).map((k) => (
              <label key={k} className="text-xs">
                <span className="label">{k === "primary" ? "Color 1" : k === "secondary" ? "Color 2" : "Texto"}</span>
                <input
                  type="color"
                  value={colors[k]}
                  onChange={(e) => setColors((c) => ({ ...c, [k]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Música</label>
            <div className="flex flex-wrap gap-2">
              <select className="input flex-1" value={music} onChange={(e) => setMusic(e.target.value)}>
                <option value="">Sin música</option>
                {reference?.spec.audio ? <option value={reference.spec.audio}>Audio del reel</option> : null}
                {tracks.map((t) => (
                  <option key={t.src} value={t.src}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost text-sm" onClick={() => musicInput.current?.click()}>
                Subir canción
              </button>
              <input ref={musicInput} type="file" accept="audio/*" hidden onChange={(e) => uploadMusic(e.target.files)} />
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-4 lg:h-fit">
        {selected.length > 0 && (template !== "replica" || reference) ? (
          <VideoPreview template={template} props={props} />
        ) : (
          <div className="card muted">Elige una persona con fotos{template === "replica" ? " y un reel" : ""} para ver la vista previa.</div>
        )}
        <button className="btn w-full justify-center" disabled={!canRender || !!rendering} onClick={render}>
          {rendering ? `Generando… ${Math.round((job?.progress ?? 0) * 100)}%` : "Generar MP4"}
        </button>
        {job?.status === "done" && job.output ? (
          <div className="card space-y-2">
            <p className="font-semibold">¡Listo! 🎉</p>
            <video src={mediaSrc(job.output)} controls className="w-full rounded-lg" />
            <div className="flex flex-wrap gap-2">
              <a className="btn text-sm" href={`${mediaSrc(job.output)}?download=1`}>
                Descargar
              </a>
              {status?.google && session ? (
                <button className="btn btn-ghost text-sm" onClick={saveToDrive}>
                  Guardar en Google Drive
                </button>
              ) : null}
            </div>
            {driveUrl ? (
              <a className="text-sm text-[var(--accent)]" href={driveUrl} target="_blank" rel="noreferrer">
                Abrir en Drive
              </a>
            ) : null}
          </div>
        ) : null}
        {job?.status === "error" ? <p className="text-sm text-red-500">Error al generar: {job.error}</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </aside>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<p className="muted">Cargando…</p>}>
      <Wizard />
    </Suspense>
  );
}

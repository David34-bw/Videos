"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Motion, Reference, Transition } from "@/lib/types";
import { mediaSrc } from "@/remotion/components/mediaSrc";
import { api } from "@/components/api";
import { useStatus } from "@/components/useStatus";

const TRANSITIONS: Record<Transition, string> = {
  cut: "Corte",
  fade: "Fundido",
  slide: "Deslizar",
  zoom: "Zoom",
  flash: "Flash",
};
const MOTIONS: Record<Motion, string> = {
  "zoom-in": "Acercar",
  "zoom-out": "Alejar",
  "pan-left": "Paneo izq.",
  "pan-right": "Paneo der.",
  still: "Quieta",
};

export default function ReferencePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const status = useStatus();
  const [ref, setRef] = useState<Reference | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<{ reference: Reference }>(`/api/references/${id}`)
      .then((d) => setRef(d.reference))
      .catch(() => router.push("/referencias"));
  }, [id, router]);

  if (!ref) return <p className="muted">Cargando…</p>;

  const patchSegment = (i: number, patch: Partial<Reference["spec"]["segments"][number]>) =>
    setRef({
      ...ref,
      spec: { ...ref.spec, segments: ref.spec.segments.map((s, j) => (j === i ? { ...s, ...patch } : s)) },
    });

  async function save() {
    if (!ref) return;
    setSaving(true);
    try {
      const { reference } = await api<{ reference: Reference }>(`/api/references/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: ref.name,
          segments: ref.spec.segments.map((s) => ({ transition: s.transition, motion: s.motion, text: s.text ?? "" })),
        }),
      });
      setRef(reference);
      setMsg("Guardado");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function refineAI() {
    if (!confirm("Esto envía hasta 12 fotogramas del video a la API de Claude (tiene costo por uso). ¿Continuar?")) return;
    setSaving(true);
    try {
      const { reference } = await api<{ reference: Reference }>(`/api/references/${id}/ai`, { method: "POST" });
      setRef(reference);
      setMsg("Plantilla afinada con IA");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    await api(`/api/references/${id}`, { method: "DELETE" });
    router.push("/referencias");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-sm text-lg font-bold"
          value={ref.name}
          onChange={(e) => setRef({ ...ref, name: e.target.value })}
        />
        <button className="btn" onClick={save} disabled={saving}>
          Guardar
        </button>
        <Link href={`/crear?plantilla=replica&referencia=${ref.id}`} className="btn btn-ghost">
          Usar con mis fotos
        </Link>
        {status?.ai ? (
          <button className="btn btn-ghost" onClick={refineAI} disabled={saving}>
            Afinar con IA
          </button>
        ) : null}
        <button className="text-sm text-red-500" onClick={remove}>
          Eliminar
        </button>
      </div>
      <p className="muted text-sm">
        {ref.spec.duration.toFixed(1)} s · {ref.spec.width}×{ref.spec.height} · {ref.spec.segments.length} escenas
        {ref.spec.bpm ? ` · ritmo ≈ ${ref.spec.bpm} BPM` : ""}
        {ref.spec.audio ? " · con audio" : " · sin audio"}
      </p>
      {ref.aiNotes ? <p className="card text-sm">🤖 {ref.aiNotes}</p> : null}
      {msg ? <p className="muted text-sm">{msg}</p> : null}
      {ref.spec.audio ? <audio controls src={mediaSrc(ref.spec.audio)} className="w-full max-w-md" /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ref.spec.segments.map((s, i) => (
          <div key={i} className="card space-y-2 p-3">
            <div className="flex gap-2">
              {ref.frames[i] ? (
                <img src={mediaSrc(ref.frames[i])} alt="" className="h-24 w-16 rounded object-cover" />
              ) : null}
              <div className="text-sm">
                <p className="font-semibold">Escena {i + 1}</p>
                <p className="muted">
                  {s.start.toFixed(2)} s · {s.duration.toFixed(2)} s
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input text-sm"
                value={s.transition}
                onChange={(e) => patchSegment(i, { transition: e.target.value as Transition })}
              >
                {Object.entries(TRANSITIONS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                className="input text-sm"
                value={s.motion}
                onChange={(e) => patchSegment(i, { motion: e.target.value as Motion })}
              >
                {Object.entries(MOTIONS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="input text-sm"
              placeholder="Texto en esta escena (opcional)"
              value={s.text ?? ""}
              onChange={(e) => patchSegment(i, { text: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { RELATIONS } from "@/lib/occasions";
import type { CustomEvent, Relation } from "@/lib/types";

export interface PersonFormValues {
  name: string;
  relation: Relation;
  birthday: string;
  relationshipStart: string;
  customEvents: CustomEvent[];
}

const EMPTY: PersonFormValues = { name: "", relation: "mama", birthday: "", relationshipStart: "", customEvents: [] };

export function PersonForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<PersonFormValues>;
  onSubmit: (v: PersonFormValues) => Promise<void> | void;
  submitLabel: string;
}) {
  const [v, setV] = useState<PersonFormValues>({ ...EMPTY, ...initial, customEvents: initial?.customEvents ?? [] });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PersonFormValues>(k: K, val: PersonFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const setEvent = (i: number, patch: Partial<CustomEvent>) =>
    set(
      "customEvents",
      v.customEvents.map((e, j) => (j === i ? { ...e, ...patch } : e)),
    );

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSubmit(v);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div>
        <label className="label">Nombre</label>
        <input className="input" value={v.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div>
        <label className="label">Relación</label>
        <select className="input" value={v.relation} onChange={(e) => set("relation", e.target.value as Relation)}>
          {Object.entries(RELATIONS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Cumpleaños</label>
        <input type="date" className="input" value={v.birthday} onChange={(e) => set("birthday", e.target.value)} />
      </div>
      {v.relation === "pareja" ? (
        <div>
          <label className="label">¿Desde cuándo están juntos? (aniversarios mensuales y anuales)</label>
          <input
            type="date"
            className="input"
            value={v.relationshipStart}
            onChange={(e) => set("relationshipStart", e.target.value)}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="label">Otras fechas (graduación, primer viaje, etc.)</label>
        {v.customEvents.map((ev, i) => (
          <div key={ev.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-[var(--line)] p-2">
            <input
              className="input col-span-2"
              placeholder="Nombre de la fecha"
              value={ev.title}
              onChange={(e) => setEvent(i, { title: e.target.value })}
            />
            <input type="date" className="input" value={ev.date} onChange={(e) => setEvent(i, { date: e.target.value })} />
            <select
              className="input"
              value={ev.recurrence}
              onChange={(e) => setEvent(i, { recurrence: e.target.value as CustomEvent["recurrence"] })}
            >
              <option value="yearly">Cada año</option>
              <option value="monthly">Cada mes</option>
              <option value="none">Una vez</option>
            </select>
            <button
              type="button"
              className="muted col-span-2 text-left text-xs"
              onClick={() => set("customEvents", v.customEvents.filter((_, j) => j !== i))}
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost text-sm"
          onClick={() =>
            set("customEvents", [
              ...v.customEvents,
              { id: Math.random().toString(36).slice(2), title: "", date: "", recurrence: "yearly" },
            ])
          }
        >
          + Agregar fecha
        </button>
      </div>

      <button className="btn" disabled={saving}>
        {saving ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OCCASIONS, RELATIONS, getCountry, upcomingEvents } from "@/lib/occasions";
import type { Person } from "@/lib/types";
import { api } from "@/components/api";
import { useStatus } from "@/components/useStatus";

function whenLabel(days: number): string {
  if (days === 0) return "¡Hoy!";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

export default function Home() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const status = useStatus();

  useEffect(() => {
    api<{ people: Person[] }>("/api/people").then((d) => setPeople(d.people));
  }, []);

  const events = useMemo(() => {
    const country = getCountry();
    return (people ?? []).flatMap((p) => upcomingEvents(p, country)).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [people]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Próximas fechas</h1>
        <p className="muted">Crea un video para cada ocasión con las fotos de la persona.</p>
      </section>

      {status && (!status.ffmpeg || !status.google) ? (
        <div className="card space-y-1 text-sm">
          {!status.ffmpeg ? <p>⚠️ No se encontró ffmpeg: lo necesitas para analizar videos de referencia.</p> : null}
          {!status.google ? (
            <p>ℹ️ Google Drive no está configurado. Puedes subir fotos desde tu computador; mira el README para conectarlo.</p>
          ) : null}
        </div>
      ) : null}

      {people === null ? (
        <p className="muted">Cargando…</p>
      ) : people.length === 0 ? (
        <div className="card">
          <p className="mb-3">Aún no tienes personas. Agrega a tu mamá, tu pareja o a quien quieras sorprender.</p>
          <Link href="/personas" className="btn">
            Agregar persona
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 24).map((ev) => {
            const occ = OCCASIONS[ev.occasion];
            const person = people.find((p) => p.id === ev.personId)!;
            const params = new URLSearchParams({ persona: ev.personId, ocasion: ev.occasion, fecha: ev.date });
            return (
              <div key={`${ev.personId}-${ev.occasion}-${ev.date}-${ev.title}`} className="card flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{occ.emoji}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ background: ev.daysLeft <= 7 ? "var(--accent)" : "var(--muted)" }}
                  >
                    {whenLabel(ev.daysLeft)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{ev.title}</p>
                  <p className="muted text-sm">
                    {ev.personName} · {RELATIONS[person.relation]} · {ev.date}
                  </p>
                </div>
                <Link href={`/crear?${params}`} className="btn mt-auto self-start text-sm">
                  Crear video
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RELATIONS } from "@/lib/occasions";
import type { Person } from "@/lib/types";
import { mediaSrc } from "@/remotion/components/mediaSrc";
import { api } from "@/components/api";
import { PersonForm, type PersonFormValues } from "@/components/PersonForm";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    api<{ people: Person[] }>("/api/people").then((d) => setPeople(d.people));
  }, []);

  async function create(values: PersonFormValues) {
    setError("");
    try {
      const { person } = await api<{ person: Person }>("/api/people", { method: "POST", body: JSON.stringify(values) });
      router.push(`/personas/${person.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Personas</h1>
        {people.length === 0 ? <p className="muted">Todavía no hay nadie.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <Link key={p.id} href={`/personas/${p.id}`} className="card flex items-center gap-3 hover:shadow">
              {p.photos[0] ? (
                <img src={mediaSrc(p.photos[0].file)} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--line)] text-xl">
                  {p.name[0]}
                </div>
              )}
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="muted text-sm">
                  {RELATIONS[p.relation]} · {p.photos.length} fotos
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="card h-fit">
        <h2 className="mb-3 text-lg font-semibold">Agregar persona</h2>
        <PersonForm onSubmit={create} submitLabel="Agregar" />
        {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
      </section>
    </div>
  );
}

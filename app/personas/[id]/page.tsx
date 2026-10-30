"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { OCCASIONS, getCountry, upcomingEvents } from "@/lib/occasions";
import type { Person } from "@/lib/types";
import { mediaSrc } from "@/remotion/components/mediaSrc";
import { api } from "@/components/api";
import { PersonForm, type PersonFormValues } from "@/components/PersonForm";
import { pickFromDrive } from "@/components/googlePicker";
import { useStatus } from "@/components/useStatus";

type PhotosResponse = { person: Person; added: number; errors: string[] };

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const status = useStatus();
  const [person, setPerson] = useState<Person | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ person: Person }>(`/api/people/${id}`)
      .then((d) => setPerson(d.person))
      .catch(() => router.push("/personas"));
  }, [id, router]);

  async function addPhotos(label: string, call: () => Promise<PhotosResponse | null>) {
    setBusy(label);
    setMsg("");
    try {
      const res = await call();
      if (res) {
        setPerson(res.person);
        setMsg(`${res.added} fotos agregadas${res.errors.length ? `. Errores: ${res.errors.join("; ")}` : ""}`);
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const fromPicker = () =>
    addPhotos("drive", async () => {
      const docs = await pickFromDrive("photos");
      if (!docs.length) return null;
      return api<PhotosResponse>(`/api/people/${id}/photos`, {
        method: "POST",
        body: JSON.stringify({ driveIds: docs.map((d) => d.id) }),
      });
    });

  const fromFolder = () =>
    addPhotos("folder", async () => {
      const [folder] = await pickFromDrive("folder");
      if (!folder) return null;
      await api(`/api/people/${id}`, { method: "PUT", body: JSON.stringify({ driveFolderId: folder.id }) });
      return api<PhotosResponse>(`/api/people/${id}/photos`, {
        method: "POST",
        body: JSON.stringify({ folderId: folder.id }),
      });
    });

  const syncFolder = () =>
    addPhotos("sync", () =>
      api<PhotosResponse>(`/api/people/${id}/photos`, {
        method: "POST",
        body: JSON.stringify({ folderId: person?.driveFolderId }),
      }),
    );

  const fromComputer = (files: FileList | null) =>
    addPhotos("local", async () => {
      if (!files?.length) return null;
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);
      return api<PhotosResponse>(`/api/people/${id}/photos`, { method: "POST", body: form });
    });

  async function removePhoto(file: string) {
    const { person: p } = await api<{ person: Person }>(`/api/people/${id}/photos?file=${encodeURIComponent(file)}`, {
      method: "DELETE",
    });
    setPerson(p);
  }

  async function save(values: PersonFormValues) {
    const { person: p } = await api<{ person: Person }>(`/api/people/${id}`, {
      method: "PUT",
      body: JSON.stringify(values),
    });
    setPerson(p);
    setMsg("Datos guardados");
  }

  async function remove() {
    if (!confirm(`¿Eliminar a ${person?.name}? Las fotos en tu Google Drive no se tocan.`)) return;
    await api(`/api/people/${id}`, { method: "DELETE" });
    router.push("/personas");
  }

  if (!person) return <p className="muted">Cargando…</p>;
  const events = upcomingEvents(person, getCountry()).slice(0, 5);
  const canDrive = status?.google && session;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{person.name}</h1>
          <Link href={`/crear?persona=${person.id}`} className="btn text-sm">
            Crear video
          </Link>
        </div>

        <div className="card space-y-3">
          <div className="flex flex-wrap gap-2">
            {canDrive ? (
              <>
                <button className="btn text-sm" disabled={!!busy} onClick={fromPicker}>
                  {busy === "drive" ? "Importando…" : "Elegir fotos de Drive"}
                </button>
                {status?.fullDriveRead ? (
                  <button className="btn btn-ghost text-sm" disabled={!!busy} onClick={fromFolder}>
                    {busy === "folder" ? "Importando…" : "Usar una carpeta de Drive"}
                  </button>
                ) : null}
                {status?.fullDriveRead && person.driveFolderId ? (
                  <button className="btn btn-ghost text-sm" disabled={!!busy} onClick={syncFolder}>
                    {busy === "sync" ? "Buscando…" : "Buscar fotos nuevas en la carpeta"}
                  </button>
                ) : null}
              </>
            ) : status?.google ? (
              <span className="muted text-sm">Conecta Google Drive (arriba a la derecha) para importar fotos.</span>
            ) : null}
            <button className="btn btn-ghost text-sm" disabled={!!busy} onClick={() => fileInput.current?.click()}>
              {busy === "local" ? "Subiendo…" : "Subir desde el computador"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void fromComputer(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {msg ? <p className="muted text-sm">{msg}</p> : null}
          {person.photos.length === 0 ? (
            <p className="muted">Sin fotos todavía.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {person.photos.map((ph) => (
                <div key={ph.file} className="group relative aspect-square overflow-hidden rounded-lg">
                  <img src={mediaSrc(ph.file)} alt={ph.name} className="h-full w-full object-cover" loading="lazy" />
                  <button
                    className="absolute right-1 top-1 hidden rounded-full bg-black/60 px-2 text-xs text-white group-hover:block"
                    onClick={() => removePhoto(ph.file)}
                    title="Quitar de la app (no se borra de Drive)"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Próximas fechas</h2>
          <ul className="space-y-1 text-sm">
            {events.map((ev) => (
              <li key={`${ev.occasion}-${ev.date}-${ev.title}`} className="flex items-center justify-between gap-2">
                <span>
                  {OCCASIONS[ev.occasion].emoji} {ev.title} · {ev.date} ({ev.daysLeft} días)
                </span>
                <Link
                  className="text-[var(--accent)]"
                  href={`/crear?${new URLSearchParams({ persona: person.id, ocasion: ev.occasion, fecha: ev.date })}`}
                >
                  Crear
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card h-fit space-y-4">
        <h2 className="text-lg font-semibold">Datos</h2>
        <PersonForm
          initial={{
            name: person.name,
            relation: person.relation,
            birthday: person.birthday ?? "",
            relationshipStart: person.relationshipStart ?? "",
            customEvents: person.customEvents,
          }}
          onSubmit={save}
          submitLabel="Guardar"
        />
        <button className="text-sm text-red-500" onClick={remove}>
          Eliminar persona
        </button>
      </section>
    </div>
  );
}

import "server-only";
import type { CustomEvent, Person, Relation } from "../types";
import { RELATIONS } from "../occasions";
import { newId } from "./storage";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function optDate(v: unknown): string | undefined {
  return typeof v === "string" && DATE_RE.test(v) ? v : undefined;
}

/** Valida y limpia los datos que llegan del formulario */
export function sanitizePerson(input: Record<string, unknown>, existing?: Person): Person {
  const name = String(input.name ?? existing?.name ?? "").trim().slice(0, 80);
  if (!name) throw new Error("El nombre es obligatorio");
  const relation = (Object.keys(RELATIONS).includes(String(input.relation)) ? input.relation : existing?.relation ?? "otro") as Relation;
  const events = Array.isArray(input.customEvents) ? input.customEvents : existing?.customEvents ?? [];
  const customEvents: CustomEvent[] = events
    .map((e: Record<string, unknown>) => ({
      id: typeof e.id === "string" ? e.id : newId(),
      title: String(e.title ?? "").trim().slice(0, 80),
      date: optDate(e.date) ?? "",
      recurrence: ["none", "monthly", "yearly"].includes(String(e.recurrence)) ? (e.recurrence as CustomEvent["recurrence"]) : "yearly",
    }))
    .filter((e) => e.title && e.date);
  const folder = typeof input.driveFolderId === "string" && /^[\w-]*$/.test(input.driveFolderId) ? input.driveFolderId : existing?.driveFolderId;
  return {
    id: existing?.id ?? newId(),
    name,
    relation,
    birthday: "birthday" in input ? optDate(input.birthday) : existing?.birthday,
    relationshipStart: "relationshipStart" in input ? optDate(input.relationshipStart) : existing?.relationshipStart,
    driveFolderId: folder || undefined,
    photos: existing?.photos ?? [],
    customEvents,
  };
}

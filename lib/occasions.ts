import type { Person, Relation, TemplateId } from "./types";

export type OccasionId =
  | "cumpleanos"
  | "aniversario-mensual"
  | "aniversario-anual"
  | "dia-madre"
  | "dia-padre"
  | "san-valentin"
  | "amor-amistad"
  | "navidad"
  | "ano-nuevo"
  | "graduacion"
  | "personalizado";

export type Country = "CO" | "MX" | "US" | "ES";

export interface Occasion {
  id: OccasionId;
  label: string;
  emoji: string;
  template: TemplateId;
  colors: { primary: string; secondary: string; text: string };
  /** Plantillas de texto; {nombre}, {edad}, {meses}, {anios} se reemplazan */
  title: string;
  subtitle: string;
  message: string;
}

export const OCCASIONS: Record<OccasionId, Occasion> = {
  cumpleanos: {
    id: "cumpleanos",
    label: "Cumpleaños",
    emoji: "🎂",
    template: "fiesta",
    colors: { primary: "#ff7a59", secondary: "#ffd166", text: "#ffffff" },
    title: "¡Feliz cumpleaños, {nombre}!",
    subtitle: "{edad} años de alegría",
    message: "Que este año te traiga todo lo que mereces.",
  },
  "aniversario-mensual": {
    id: "aniversario-mensual",
    label: "Aniversario mensual",
    emoji: "💞",
    template: "romantica",
    colors: { primary: "#e84a7f", secondary: "#ffb3c6", text: "#ffffff" },
    title: "¡{meses} meses juntos!",
    subtitle: "Feliz mes, {nombre}",
    message: "Cada mes contigo es mi favorito.",
  },
  "aniversario-anual": {
    id: "aniversario-anual",
    label: "Aniversario",
    emoji: "💍",
    template: "romantica",
    colors: { primary: "#c9184a", secondary: "#ff8fa3", text: "#ffffff" },
    title: "¡{anios} de amor!",
    subtitle: "Feliz aniversario, {nombre}",
    message: "Gracias por cada momento a mi lado.",
  },
  "dia-madre": {
    id: "dia-madre",
    label: "Día de la Madre",
    emoji: "🌷",
    template: "clasica",
    colors: { primary: "#9d4edd", secondary: "#f4acb7", text: "#ffffff" },
    title: "¡Feliz Día de la Madre!",
    subtitle: "Para {nombre}, con todo mi amor",
    message: "Gracias por todo lo que haces por mí.",
  },
  "dia-padre": {
    id: "dia-padre",
    label: "Día del Padre",
    emoji: "👔",
    template: "clasica",
    colors: { primary: "#1d3557", secondary: "#a8dadc", text: "#ffffff" },
    title: "¡Feliz Día del Padre!",
    subtitle: "Para {nombre}, mi ejemplo",
    message: "Gracias por estar siempre.",
  },
  "san-valentin": {
    id: "san-valentin",
    label: "San Valentín",
    emoji: "❤️",
    template: "romantica",
    colors: { primary: "#d00000", secondary: "#ffccd5", text: "#ffffff" },
    title: "Feliz San Valentín",
    subtitle: "{nombre}, eres mi persona favorita",
    message: "Te quiero hoy y siempre.",
  },
  "amor-amistad": {
    id: "amor-amistad",
    label: "Amor y Amistad",
    emoji: "💌",
    template: "romantica",
    colors: { primary: "#ef476f", secondary: "#ffd6e0", text: "#ffffff" },
    title: "Feliz Día del Amor y la Amistad",
    subtitle: "Para {nombre}",
    message: "Gracias por ser parte de mi vida.",
  },
  navidad: {
    id: "navidad",
    label: "Navidad",
    emoji: "🎄",
    template: "fiesta",
    colors: { primary: "#2d6a4f", secondary: "#e63946", text: "#ffffff" },
    title: "¡Feliz Navidad, {nombre}!",
    subtitle: "Recuerdos de este año",
    message: "Que la magia de estas fechas nos acompañe.",
  },
  "ano-nuevo": {
    id: "ano-nuevo",
    label: "Año Nuevo",
    emoji: "🎆",
    template: "fiesta",
    colors: { primary: "#3a0ca3", secondary: "#f9c74f", text: "#ffffff" },
    title: "¡Feliz Año Nuevo!",
    subtitle: "Por más momentos juntos, {nombre}",
    message: "Lo mejor está por venir.",
  },
  graduacion: {
    id: "graduacion",
    label: "Graduación",
    emoji: "🎓",
    template: "fiesta",
    colors: { primary: "#003049", secondary: "#fcbf49", text: "#ffffff" },
    title: "¡Felicidades, {nombre}!",
    subtitle: "Lo lograste",
    message: "Estoy muy orgulloso de ti.",
  },
  personalizado: {
    id: "personalizado",
    label: "Recordatorio",
    emoji: "⭐",
    template: "clasica",
    colors: { primary: "#264653", secondary: "#e9c46a", text: "#ffffff" },
    title: "{nombre}",
    subtitle: "Un recuerdo especial",
    message: "Para que nunca lo olvides.",
  },
};

export const RELATIONS: Record<Relation, string> = {
  mama: "Mamá",
  papa: "Papá",
  pareja: "Pareja",
  hermano: "Hermano/a",
  hijo: "Hijo/a",
  amigo: "Amigo/a",
  otro: "Otro",
};

// ---------- Cálculo de fechas ----------

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** n-ésimo día de la semana (0 = domingo) de un mes; month 0-11 */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

/** Último día válido del mes, para aniversarios del 29-31 */
function clampDay(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

function mothersDay(year: number, country: Country): Date {
  switch (country) {
    case "MX":
      return new Date(year, 4, 10);
    case "ES":
      return nthWeekday(year, 4, 0, 1);
    default:
      return nthWeekday(year, 4, 0, 2);
  }
}

function fathersDay(year: number, country: Country): Date {
  if (country === "ES") return new Date(year, 2, 19);
  return nthWeekday(year, 5, 0, 3);
}

/** Amor y Amistad en Colombia: tercer sábado de septiembre */
function amorAmistad(year: number): Date {
  return nthWeekday(year, 8, 6, 3);
}

export interface UpcomingEvent {
  personId: string;
  personName: string;
  occasion: OccasionId;
  title: string;
  date: string;
  daysLeft: number;
  /** Datos para rellenar los textos */
  vars: Record<string, string>;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Próxima ocurrencia (>= hoy) de una fecha que se repite cada año */
function nextYearly(today: Date, fn: (year: number) => Date): Date {
  const thisYear = fn(today.getFullYear());
  return thisYear >= today ? thisYear : fn(today.getFullYear() + 1);
}

function monthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
}

export function upcomingEvents(
  person: Person,
  country: Country,
  todayInput = new Date(),
): UpcomingEvent[] {
  const today = new Date(todayInput.getFullYear(), todayInput.getMonth(), todayInput.getDate());
  const out: UpcomingEvent[] = [];
  const push = (occasion: OccasionId, date: Date, vars: Record<string, string> = {}, title?: string) =>
    out.push({
      personId: person.id,
      personName: person.name,
      occasion,
      title: title ?? OCCASIONS[occasion].label,
      date: ymd(date),
      daysLeft: daysBetween(today, date),
      vars: { nombre: person.name, ...vars },
    });

  if (person.birthday) {
    const b = parseYmd(person.birthday);
    const next = nextYearly(today, (y) => clampDay(y, b.getMonth(), b.getDate()));
    push("cumpleanos", next, { edad: String(next.getFullYear() - b.getFullYear()) });
  }

  if (person.relation === "pareja" && person.relationshipStart) {
    const s = parseYmd(person.relationshipStart);
    // Aniversario mensual: próximo mes cumplido (se omite cuando coincide con el anual)
    let monthly = clampDay(today.getFullYear(), today.getMonth(), s.getDate());
    if (monthly < today) monthly = clampDay(today.getFullYear(), today.getMonth() + 1, s.getDate());
    const months = monthsBetween(s, monthly);
    if (months > 0 && months % 12 !== 0) {
      push("aniversario-mensual", monthly, { meses: String(months) });
    }
    const yearly = nextYearly(today, (y) => clampDay(y, s.getMonth(), s.getDate()));
    const years = yearly.getFullYear() - s.getFullYear();
    if (years > 0) {
      push("aniversario-anual", yearly, { anios: years === 1 ? "1 año" : `${years} años` });
    }
  }

  if (person.relation === "pareja") {
    push("san-valentin", nextYearly(today, (y) => new Date(y, 1, 14)));
    if (country === "CO") push("amor-amistad", nextYearly(today, amorAmistad));
  }
  if (person.relation === "amigo" && country === "CO") {
    push("amor-amistad", nextYearly(today, amorAmistad));
  }
  if (person.relation === "mama") push("dia-madre", nextYearly(today, (y) => mothersDay(y, country)));
  if (person.relation === "papa") push("dia-padre", nextYearly(today, (y) => fathersDay(y, country)));

  push("navidad", nextYearly(today, (y) => new Date(y, 11, 25)));

  for (const ev of person.customEvents) {
    const d = parseYmd(ev.date);
    let next: Date | null = null;
    if (ev.recurrence === "none") next = d >= today ? d : null;
    if (ev.recurrence === "yearly") next = nextYearly(today, (y) => clampDay(y, d.getMonth(), d.getDate()));
    if (ev.recurrence === "monthly") {
      next = clampDay(today.getFullYear(), today.getMonth(), d.getDate());
      if (next < today) next = clampDay(today.getFullYear(), today.getMonth() + 1, d.getDate());
      if (next < d) next = d;
    }
    if (next) push("personalizado", next, {}, ev.title);
  }

  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function fillText(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

export function getCountry(): Country {
  const c = process.env.NEXT_PUBLIC_COUNTRY as Country | undefined;
  return c && ["CO", "MX", "US", "ES"].includes(c) ? c : "CO";
}

/**
 * Variables de texto para una persona en una fecha ({nombre}, {edad},
 * {meses}, {anios}), calculadas para la próxima ocurrencia a partir de
 * `ref` (por defecto hoy). Sirve aunque la ocasión no esté en la lista.
 */
export function textVars(person: Person, ref = new Date()): Record<string, string> {
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const vars: Record<string, string> = { nombre: person.name };
  if (person.birthday) {
    const b = parseYmd(person.birthday);
    const next = nextYearly(today, (y) => clampDay(y, b.getMonth(), b.getDate()));
    vars.edad = String(next.getFullYear() - b.getFullYear());
  }
  if (person.relationshipStart) {
    const s = parseYmd(person.relationshipStart);
    let monthly = clampDay(today.getFullYear(), today.getMonth(), s.getDate());
    if (monthly < today) monthly = clampDay(today.getFullYear(), today.getMonth() + 1, s.getDate());
    vars.meses = String(Math.max(1, monthsBetween(s, monthly)));
    const years = nextYearly(today, (y) => clampDay(y, s.getMonth(), s.getDate())).getFullYear() - s.getFullYear();
    vars.anios = years === 1 ? "1 año" : `${Math.max(1, years)} años`;
  }
  return vars;
}

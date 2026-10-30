export type Relation = "mama" | "papa" | "pareja" | "hermano" | "amigo" | "hijo" | "otro";

export type Recurrence = "none" | "monthly" | "yearly";

export interface CustomEvent {
  id: string;
  title: string;
  /** Fecha ISO (YYYY-MM-DD) de la primera ocurrencia */
  date: string;
  recurrence: Recurrence;
}

export interface Photo {
  /** Nombre del archivo en caché local (data/media) */
  file: string;
  source: "drive" | "local";
  driveId?: string;
  name: string;
}

export interface Person {
  id: string;
  name: string;
  relation: Relation;
  /** YYYY-MM-DD */
  birthday?: string;
  /** Inicio de la relación (pareja) YYYY-MM-DD */
  relationshipStart?: string;
  driveFolderId?: string;
  photos: Photo[];
  customEvents: CustomEvent[];
}

export type TemplateId = "clasica" | "romantica" | "fiesta" | "replica";

export type Aspect = "vertical" | "cuadrado" | "horizontal";

export type Transition = "cut" | "fade" | "slide" | "zoom" | "flash";
export type Motion = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "still";

export interface SpecSegment {
  /** Segundos desde el inicio */
  start: number;
  duration: number;
  transition: Transition;
  motion: Motion;
  /** Texto opcional que aparece en este segmento */
  text?: string;
}

export interface TemplateSpec {
  width: number;
  height: number;
  fps: number;
  duration: number;
  bpm: number | null;
  /** Archivo de audio extraído (data/media) */
  audio: string | null;
  segments: SpecSegment[];
}

export interface Reference {
  id: string;
  name: string;
  sourceUrl?: string;
  createdAt: string;
  /** Fotograma representativo por segmento (data/media) */
  frames: string[];
  spec: TemplateSpec;
  aiNotes?: string;
}

export interface VideoProps {
  [key: string]: unknown;
  photos: string[];
  title: string;
  subtitle: string;
  message: string;
  aspect: Aspect;
  /** Paleta de la ocasión */
  colors: { primary: string; secondary: string; text: string };
  music: string | null;
  secondsPerPhoto: number;
  /** Solo para la plantilla réplica */
  spec?: TemplateSpec | null;
}

export interface RenderJob {
  id: string;
  status: "queued" | "rendering" | "done" | "error";
  progress: number;
  output?: string;
  error?: string;
  createdAt: string;
  driveFileId?: string;
}

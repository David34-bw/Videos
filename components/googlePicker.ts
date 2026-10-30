"use client";

/* Tipos mínimos del Google Picker (se carga desde apis.google.com) */
interface PickerDoc {
  id: string;
  mimeType: string;
  name: string;
}
interface PickerResponse {
  action: string;
  docs?: PickerDoc[];
}
// El Picker no publica tipos oficiales en npm
type Any = any;

declare global {
  interface Window {
    gapi?: Any;
    google?: Any;
  }
}

let loader: Promise<void> | null = null;

function loadPicker(): Promise<void> {
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.async = true;
    s.onload = () => window.gapi.load("picker", { callback: () => resolve(), onerror: reject });
    s.onerror = () => reject(new Error("No se pudo cargar Google Picker"));
    document.head.appendChild(s);
  });
  return loader;
}

/**
 * Abre el selector de Google Drive. Devuelve los IDs elegidos.
 * mode "photos": varias imágenes; mode "folder": una carpeta.
 */
export async function pickFromDrive(mode: "photos" | "folder"): Promise<PickerDoc[]> {
  const res = await fetch("/api/google/token");
  const cfg = (await res.json()) as { accessToken?: string; apiKey?: string; appId?: string; error?: string };
  if (!res.ok || !cfg.accessToken) throw new Error(cfg.error ?? "Inicia sesión con Google");
  if (!cfg.apiKey) throw new Error("Falta NEXT_PUBLIC_GOOGLE_API_KEY en .env.local");
  await loadPicker();
  const picker = window.google.picker;

  return new Promise((resolve) => {
    const view =
      mode === "photos"
        ? new picker.DocsView(picker.ViewId.DOCS_IMAGES).setIncludeFolders(true)
        : new picker.DocsView(picker.ViewId.FOLDERS).setSelectFolderEnabled(true).setIncludeFolders(true);
    const builder = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(cfg.accessToken)
      .setDeveloperKey(cfg.apiKey)
      .setLocale("es")
      .setTitle(mode === "photos" ? "Elige las fotos" : "Elige una carpeta")
      .setCallback((data: PickerResponse) => {
        if (data.action === picker.Action.PICKED) resolve(data.docs ?? []);
        if (data.action === picker.Action.CANCEL) resolve([]);
      });
    if (cfg.appId) builder.setAppId(cfg.appId);
    if (mode === "photos") builder.enableFeature(picker.Feature.MULTISELECT_ENABLED);
    builder.build().setVisible(true);
  });
}

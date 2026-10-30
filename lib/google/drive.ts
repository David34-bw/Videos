import "server-only";
import fs from "node:fs/promises";
import { extFromMime, saveMedia } from "../server/storage";
import type { Photo } from "../types";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
// Formatos que Chrome muestra directamente; el resto (HEIC, RAW) se pide como miniatura JPG grande
const BROWSER_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
}

async function driveFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Drive respondió ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

async function list(token: string, q: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q,
      fields: "nextPageToken, files(id, name, mimeType, thumbnailLink)",
      pageSize: "200",
      orderBy: "createdTime",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await driveFetch(token, `${API}/files?${params}`);
    const data = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
    files.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken && files.length < 1000);
  return files;
}

function escapeQ(id: string): string {
  if (!/^[\w-]+$/.test(id)) throw new Error("ID de Drive inválido");
  return id;
}

export function listImagesInFolder(token: string, folderId: string) {
  return list(token, `'${escapeQ(folderId)}' in parents and mimeType contains 'image/' and trashed = false`);
}

export function listFolders(token: string, parentId = "root") {
  return list(
    token,
    `'${escapeQ(parentId)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
}

export async function getFile(token: string, id: string): Promise<DriveFile> {
  const res = await driveFetch(token, `${API}/files/${escapeQ(id)}?fields=id,name,mimeType,thumbnailLink`);
  return (await res.json()) as DriveFile;
}

/** Descarga una imagen de Drive a la caché local y devuelve la foto */
export async function importDriveImage(token: string, file: DriveFile): Promise<Photo> {
  let data: ArrayBuffer;
  let ext: string;
  if (BROWSER_IMAGES.includes(file.mimeType)) {
    data = await (await driveFetch(token, `${API}/files/${escapeQ(file.id)}?alt=media`)).arrayBuffer();
    ext = extFromMime(file.mimeType);
  } else if (file.thumbnailLink) {
    const big = file.thumbnailLink.replace(/=s\d+$/, "=s2048");
    data = await (await driveFetch(token, big)).arrayBuffer();
    ext = "jpg";
  } else {
    throw new Error(`Formato no soportado: ${file.name}`);
  }
  const name = await saveMedia(Buffer.from(data), ext);
  return { file: name, source: "drive", driveId: file.id, name: file.name };
}

/** Sube el video terminado a Drive (subida reanudable, sirve para archivos grandes) */
export async function uploadVideo(token: string, localPath: string, name: string, folderId?: string): Promise<string> {
  const body = await fs.readFile(localPath);
  const init = await driveFetch(token, `${UPLOAD}/files?uploadType=resumable`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(body.length),
    },
    body: JSON.stringify({ name, mimeType: "video/mp4", ...(folderId ? { parents: [escapeQ(folderId)] } : {}) }),
  });
  const location = init.headers.get("location");
  if (!location) throw new Error("Google Drive no devolvió la URL de subida");
  const res = await driveFetch(token, location, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body,
  });
  const data = (await res.json()) as { id: string };
  return data.id;
}

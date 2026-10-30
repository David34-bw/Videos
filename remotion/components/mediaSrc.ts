/**
 * Las fotos/música se guardan en data/media. En la web se sirven por
 * /api/media/<archivo>; en el render, scripts/render.mjs levanta un
 * servidor local y pasa URLs absolutas. Un nombre sin "/" se resuelve
 * contra la ruta de la web.
 */
export function mediaSrc(file: string): string {
  if (/^(https?:|data:|blob:|\/)/.test(file)) return file;
  return `/api/media/${encodeURIComponent(file)}`;
}

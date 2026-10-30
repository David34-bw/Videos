// Renderiza un video con Remotion en un proceso aparte.
// Uso: node scripts/render.mjs <job.json>
// job.json: { "template": "fiesta", "props": {...}, "output": "/ruta/salida.mp4" }
// Imprime líneas JSON con el progreso: {"progress":0.42} ... {"done":true}
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const root = process.cwd();
const MEDIA_DIR = path.join(root, "data", "media");
const MUSIC_DIR = path.join(root, "public", "music");
const MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg",
};

const emit = (obj) => process.stdout.write(JSON.stringify(obj) + "\n");

/** Servidor local para que Chrome cargue fotos y música durante el render */
function startMediaServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const [, kind, raw] = url.pathname.split("/");
    const name = decodeURIComponent(raw ?? "");
    const dir = kind === "media" ? MEDIA_DIR : kind === "music" ? MUSIC_DIR : null;
    if (!dir || !name || name.includes("/") || name.includes("\\") || name.startsWith(".")) {
      res.writeHead(404).end();
      return;
    }
    const file = path.join(dir, name);
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404).end();
        return;
      }
      const type = MIME[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
      const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
      const headers = { "Content-Type": type, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" };
      if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
        res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": end - start + 1 });
        fs.createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { ...headers, "Content-Length": stat.size });
        fs.createReadStream(file).pipe(res);
      }
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

/** "abc.jpg" → http://127.0.0.1:PUERTO/media/abc.jpg ; "/music/x.mp3" → .../music/x.mp3 */
function toUrl(base, src) {
  if (!src) return src;
  if (/^(https?:|data:)/.test(src)) return src;
  if (src.startsWith("/music/")) return `${base}${src}`;
  if (src.startsWith("/api/media/")) return `${base}/media/${src.slice("/api/media/".length)}`;
  return `${base}/media/${encodeURIComponent(src)}`;
}

async function main() {
  const jobFile = process.argv[2];
  if (!jobFile) throw new Error("Falta el archivo del trabajo");
  const job = JSON.parse(fs.readFileSync(jobFile, "utf8"));

  const server = await startMediaServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const props = {
      ...job.props,
      photos: job.props.photos.map((p) => toUrl(base, p)),
      music: toUrl(base, job.props.music),
      spec: job.props.spec ? { ...job.props.spec, audio: toUrl(base, job.props.spec.audio) } : null,
    };

    emit({ stage: "bundling" });
    const serveUrl = await bundle({ entryPoint: path.join(root, "remotion", "index.ts") });
    const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
    const composition = await selectComposition({ serveUrl, id: job.template, inputProps: props, browserExecutable });

    emit({ stage: "rendering", durationInFrames: composition.durationInFrames });
    let last = -1;
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: job.output,
      inputProps: props,
      browserExecutable,
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 100);
        if (p !== last) {
          last = p;
          emit({ progress });
        }
      },
    });
    emit({ done: true });
  } finally {
    server.close();
  }
}

main().catch((e) => {
  emit({ error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});

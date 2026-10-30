import fs from "node:fs";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { mediaPath } from "@/lib/server/storage";
import { mimeOf } from "@/lib/server/mime";
import { jsonError } from "@/lib/server/http";

type Ctx = { params: Promise<{ file: string }> };

/** Sirve archivos de data/media con soporte de Range (necesario para audio/video) */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { file } = await params;
  let filePath: string;
  try {
    filePath = mediaPath(file);
  } catch {
    return jsonError("No encontrado", 404);
  }
  let size: number;
  try {
    size = fs.statSync(filePath).size;
  } catch {
    return jsonError("No encontrado", 404);
  }

  const headers: Record<string, string> = {
    "Content-Type": mimeOf(file),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
  };
  if (req.nextUrl.searchParams.get("download")) {
    headers["Content-Disposition"] = `attachment; filename="video.${file.split(".").pop()}"`;
  }

  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}

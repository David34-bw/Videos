import { NextResponse } from "next/server";
import { fullDriveRead, googleEnabled } from "@/lib/auth";
import { aiEnabled } from "@/lib/reference/ai";
import { FFMPEG, FFPROBE, YT_DLP, isAvailable } from "@/lib/server/exec";

export async function GET() {
  const [ffmpeg, ffprobe, ytdlp] = await Promise.all([isAvailable(FFMPEG), isAvailable(FFPROBE), isAvailable(YT_DLP)]);
  return NextResponse.json({
    google: googleEnabled(),
    fullDriveRead: fullDriveRead(),
    ffmpeg: ffmpeg && ffprobe,
    ytdlp,
    ai: aiEnabled(),
  });
}

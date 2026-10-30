import { NextResponse, type NextRequest } from "next/server";
import { getDb, updateDb } from "@/lib/server/storage";
import { sanitizePerson } from "@/lib/server/people";
import { errorMessage, jsonError } from "@/lib/server/http";

export async function GET() {
  const db = await getDb();
  return NextResponse.json({ people: db.people });
}

export async function POST(req: NextRequest) {
  try {
    const person = sanitizePerson(await req.json());
    await updateDb((db) => db.people.push(person));
    return NextResponse.json({ person });
  } catch (e) {
    return jsonError(errorMessage(e));
  }
}

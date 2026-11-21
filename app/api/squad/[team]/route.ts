import { NextResponse } from "next/server";
import { describeError, getSquad } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ team: string }> }) {
  const raw = (await params).team;
  if (!/^\d{1,10}$/.test(raw)) return NextResponse.json({ error: "Invalid team id." }, { status: 400 });
  try {
    const squad = await getSquad(Number(raw));
    const players = (squad?.players ?? []).map((p) => ({ id: p.id, name: p.name, number: p.number, position: p.position }));
    return NextResponse.json({ players }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    const { kind, message } = describeError(err);
    return NextResponse.json({ error: message }, { status: kind === "setup" ? 503 : 502 });
  }
}

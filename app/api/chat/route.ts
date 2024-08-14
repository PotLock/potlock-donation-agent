import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildNotImplementedMessage() {
  return {
    error:
      "Teacher verify endpoint ainda nao foi implementado neste branch. Adicione netlify/functions/teacher-verify.js para habilitar /api/teacher/verify.",
  };
}

export async function GET() {
  return NextResponse.json(buildNotImplementedMessage(), { status: 501 });
}

export async function POST() {
  return NextResponse.json(buildNotImplementedMessage(), { status: 501 });
}

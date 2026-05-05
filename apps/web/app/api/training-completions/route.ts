import { NextResponse } from "next/server";
import { setTrainingCompletionToApi } from "@/lib/health/api-data";

export async function POST(request: Request) {
  const body = await request.json();
  await setTrainingCompletionToApi({ ...body, completed: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  await setTrainingCompletionToApi({ ...body, completed: false });
  return NextResponse.json({ ok: true });
}

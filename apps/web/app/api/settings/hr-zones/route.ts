import { NextResponse } from "next/server";
import { saveHrZonesToApi } from "@/lib/health/api-data";

export async function PATCH(request: Request) {
  const body = await request.json();
  await saveHrZonesToApi(body.hrZones);
  return NextResponse.json({ ok: true });
}

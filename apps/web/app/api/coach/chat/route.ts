import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/health/api-data";

function getUserQuery() {
  const params = new URLSearchParams();
  if (process.env.WEB_USER_ID) params.set("userId", process.env.WEB_USER_ID);
  if (process.env.WEB_TELEGRAM_ID) params.set("telegramId", process.env.WEB_TELEGRAM_ID);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function getUserBody() {
  return {
    userId: process.env.WEB_USER_ID || undefined,
    telegramId: process.env.WEB_TELEGRAM_ID || undefined,
  };
}

export async function GET() {
  const response = await apiFetch(`/web/chat/messages${getUserQuery()}`);
  const body = await response.json();

  if (!response.ok) {
    return NextResponse.json(body, { status: response.status });
  }

  return NextResponse.json(body);
}

export async function POST(request: Request) {
  const body = await request.json();
  const response = await apiFetch("/web/chat", {
    method: "POST",
    body: JSON.stringify({ ...getUserBody(), message: body.message }),
  });
  const responseBody = await response.json();

  if (!response.ok) {
    return NextResponse.json(responseBody, { status: response.status });
  }

  return NextResponse.json(responseBody);
}

import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.SITE_PASSWORD || "masonum";

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  if (body.password !== PASSWORD) {
    return NextResponse.json({ ok: false, error: "wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("site_auth", "ok", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  return res;
}

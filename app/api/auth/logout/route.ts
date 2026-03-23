import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  const cookieOpts = {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set("access_token", "", { ...cookieOpts, httpOnly: true });
  response.cookies.set("portal_session", "", cookieOpts);

  return response;
}

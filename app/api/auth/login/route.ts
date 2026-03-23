import { NextRequest, NextResponse } from "next/server";
import type { LoginResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { message: "Email y contraseña son requeridos" },
      { status: 400 }
    );
  }

  const backendUrl = process.env.STATS_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { message: "Servidor no configurado. Contacte al administrador." },
      { status: 503 }
    );
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar al servidor. Intenta de nuevo." },
      { status: 503 }
    );
  }

  if (!backendRes.ok) {
    const err = await backendRes.json().catch(() => ({ message: "Credenciales inválidas" }));
    return NextResponse.json(err, { status: backendRes.status });
  }

  const data: LoginResponse = await backendRes.json();
  const { accessToken, user, companies } = data;

  const sessionPayload = Buffer.from(
    JSON.stringify({ user, companies })
  ).toString("base64");

  const cookieOpts = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  };

  const response = NextResponse.json({ user, companies });
  response.cookies.set("access_token", accessToken, { ...cookieOpts, httpOnly: true });
  response.cookies.set("portal_session", sessionPayload, { ...cookieOpts, httpOnly: false });

  return response;
}

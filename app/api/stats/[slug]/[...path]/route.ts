import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.STATS_BACKEND_URL ?? "";

type RouteContext = {
  params: Promise<{ slug: string; path: string[] }>;
};

async function proxyRequest(req: NextRequest, context: RouteContext) {
  const { slug, path } = await context.params;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  if (!BACKEND_URL) {
    return NextResponse.json(
      { message: "Backend no configurado. Contacte al administrador." },
      { status: 503 }
    );
  }

  const endpoint = path.join("/");
  const queryString = req.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_URL}/api/stats/${slug}/${endpoint}${queryString ? `?${queryString}` : ""}`;

  let backendRes: Response;
  try {
    const init: RequestInit = {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.text();
    }

    backendRes = await fetch(targetUrl, init);
  } catch {
    return NextResponse.json(
      { message: "Error al conectar con el servidor de estadísticas." },
      { status: 503 }
    );
  }

  const contentType = backendRes.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  }

  // Forward non-JSON responses as-is
  const body = await backendRes.arrayBuffer();
  return new NextResponse(body, {
    status: backendRes.status,
    headers: { "content-type": contentType },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;

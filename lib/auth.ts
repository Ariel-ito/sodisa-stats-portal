import { cookies } from "next/headers";
import type { PortalSession } from "./types";

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get("access_token")?.value ?? null;
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const store = await cookies();
  const raw = store.get("portal_session")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as PortalSession;
  } catch {
    return null;
  }
}

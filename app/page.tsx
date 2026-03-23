import { redirect } from "next/navigation";
import { getAccessToken, getPortalSession } from "@/lib/auth";

export default async function RootPage() {
  const token = await getAccessToken();
  if (!token) redirect("/login");

  const session = await getPortalSession();
  if (!session) redirect("/login");

  if (session.companies.length === 1) {
    redirect(`/stats/${session.companies[0].slug}`);
  }

  redirect("/companies");
}

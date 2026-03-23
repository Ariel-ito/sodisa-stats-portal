import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalSession } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function CompaniesPage() {
  const session = await getPortalSession();

  if (!session) redirect("/login");

  // Single company — skip selection
  if (session.companies.length === 1) {
    redirect(`/stats/${session.companies[0].slug}`);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">SODISA Portal</h1>
            <p className="text-xs text-gray-500">Bienvenido, {session.user.name}</p>
          </div>
        </div>
        <LogoutButton />
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Seleccionar empresa</h2>
            <p className="text-gray-500 mt-1">
              Elige la empresa cuyas estadísticas deseas consultar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {session.companies.map((company) => (
              <Link
                key={company.id}
                href={`/stats/${company.slug}`}
                className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {company.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{company.slug}</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors ml-auto flex-shrink-0"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

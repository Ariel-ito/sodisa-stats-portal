import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SODISA – Portal de Estadísticas",
  description: "Portal estadístico empresarial SODISA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}

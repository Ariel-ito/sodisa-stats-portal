import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "SODISA – Portal de Estadísticas",
  description: "Portal estadístico empresarial SODISA",
  verification: {
    google: "7_iKAfcYQUs0Z2-RYMOAf33K6vftTDeZ2_u7kvV3jnM",
  },
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

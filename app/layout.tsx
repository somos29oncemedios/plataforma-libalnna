import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Libalnna - Plataforma de Estadísticas",
  description: "Estadísticas, resultados y calendario oficial de la liga Libalnna.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* Ajuste Móvil: Se agregó pb-20 md:pb-0 para que el contenido respire sobre la App Bar flotante */}
      <body className="bg-libalnna-light text-libalnna-dark min-h-screen pb-20 md:pb-0">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
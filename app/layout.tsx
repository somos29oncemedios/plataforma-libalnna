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
      <body className="bg-libalnna-light text-libalnna-dark min-h-screen">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
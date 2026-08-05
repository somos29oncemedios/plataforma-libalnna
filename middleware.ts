import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Buscamos si el usuario tiene la credencial de sesión activa
  const credencial = request.cookies.get('sb-access-token')?.value || request.cookies.get('libalnna_admin')?.value;

  // Si no hay credencial, rebotamos al usuario a la página de login
  if (!credencial) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// 📋 Zonas VIP protegidas
export const config = {
  matcher: [
    '/panel/:path*',
    '/registro-equipos/:path*',
    '/registro-jugadores/:path*',
    '/mesa-tecnica/:path*',
    '/registro-partidos/:path*',
  ],
};
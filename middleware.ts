import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // El guardaespaldas revisa si el usuario tiene la credencial (cookie)
  const credencial = request.cookies.get('libalnna_admin')?.value;

  // Si no tiene la credencial, lo rebotamos a la página de Login
  if (credencial !== 'acceso_concedido') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si tiene la credencial, lo dejamos pasar a la zona VIP
  return NextResponse.next();
}

// 📋 Aquí definimos cuáles son las ZONAS VIP (Rutas Protegidas)
export const config = {
  matcher: [
    '/registro-equipos/:path*',
    '/registro-jugadores/:path*',
    '/mesa-tecnica/:path*',
    '/registro-partidos/:path*',
  ],
};
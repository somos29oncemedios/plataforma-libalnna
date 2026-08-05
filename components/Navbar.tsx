'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  // Atrapamos la ruta actual para saber qué ícono iluminar
  const pathname = usePathname();

  return (
    <>
      {/* 1. TOP NAVBAR (Para PC y Cabecera de Móvil) */}
      <nav className="bg-white border-b border-gray-200 text-gray-900 p-4 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          
          {/* Logo de la agencia 29once */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img 
              src="/logo-29once.png" 
              alt="Logo 29once Agencia" 
              className="h-10 w-auto object-contain" 
            />
          </Link>
          
          {/* Enlaces Desktop (Se ocultan en móviles con 'hidden md:flex') */}
          <div className="hidden md:flex gap-4 md:gap-8 font-semibold text-sm tracking-wide items-center">
            <Link href="/" className={`transition-colors ${pathname === '/' ? 'text-blue-600' : 'hover:text-gray-500'}`}>INICIO</Link>
            <Link href="/calendario" className={`transition-colors ${pathname === '/calendario' ? 'text-blue-600' : 'hover:text-gray-500'}`}>PARTIDOS</Link>
            <Link href="/equipos" className={`transition-colors ${pathname === '/equipos' ? 'text-blue-600' : 'hover:text-gray-500'}`}>EQUIPOS</Link>
            <Link href="/posiciones" className={`transition-colors ${pathname === '/posiciones' ? 'text-blue-600' : 'hover:text-gray-500'}`}>POSICIONES</Link>
          </div>
          
          {/* Botón VIP Panel (Siempre visible, ícono discreto) */}
          <Link 
            href="/panel" 
            title="Panel de Administración"
            className="text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 p-2 rounded-full transition-colors border border-gray-200 hover:border-blue-200 ml-auto md:ml-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </Link>

        </div>
      </nav>

      {/* 2. BOTTOM APP BAR (Solo para Móviles) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 z-50 px-2 pb-safe">
        <div className="flex justify-around items-center py-2">
          
          {/* Ícono: Inicio */}
          <Link 
            href="/" 
            className={`p-3 rounded-2xl transition-all duration-300 flex justify-center items-center ${pathname === '/' ? 'bg-blue-50 text-blue-600 scale-110 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </Link>
          
          {/* Ícono: Calendario */}
          <Link 
            href="/calendario" 
            className={`p-3 rounded-2xl transition-all duration-300 flex justify-center items-center ${pathname === '/calendario' ? 'bg-blue-50 text-blue-600 scale-110 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </Link>
          
          {/* Ícono: Equipos */}
          <Link 
            href="/equipos" 
            className={`p-3 rounded-2xl transition-all duration-300 flex justify-center items-center ${pathname === '/equipos' ? 'bg-blue-50 text-blue-600 scale-110 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </Link>
          
          {/* Ícono: Posiciones */}
          <Link 
            href="/posiciones" 
            className={`p-3 rounded-2xl transition-all duration-300 flex justify-center items-center ${pathname === '/posiciones' ? 'bg-blue-50 text-blue-600 scale-110 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </Link>

        </div>
      </nav>
    </>
  );
}
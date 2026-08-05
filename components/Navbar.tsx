import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 text-gray-900 p-4 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        
        {/* Logo de la agencia 29once */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img 
            src="/logo-29once.png" 
            alt="Logo 29once Agencia" 
            className="h-10 w-auto object-contain" 
          />
        </Link>
        
        {/* Enlaces limpios para el público */}
        <div className="flex gap-4 md:gap-8 font-semibold text-sm tracking-wide items-center overflow-x-auto whitespace-nowrap scrollbar-hide">
          <Link href="/" className="hover:text-blue-600 transition-colors">INICIO</Link>
          <Link href="/calendario" className="hover:text-blue-600 transition-colors">PARTIDOS</Link>
          <Link href="/equipos" className="hover:text-blue-600 transition-colors">EQUIPOS</Link>
          <Link href="/posiciones" className="hover:text-blue-600 transition-colors">POSICIONES</Link>
          
          {/* Botón VIP para el Panel (Solo Ícono discreto) */}
          <Link 
            href="/panel" 
            title="Panel de Administración"
            className="text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 p-2 rounded-full transition-colors border border-gray-200 hover:border-blue-200 ml-2 shadow-sm"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </Link>
        </div>
        
      </div>
    </nav>
  );
}
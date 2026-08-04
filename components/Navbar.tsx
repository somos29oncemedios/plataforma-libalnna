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
        <div className="flex gap-8 font-semibold text-sm tracking-wide">
          <Link href="/" className="hover:text-blue-600 transition-colors">INICIO</Link>
          <Link href="/calendario" className="hover:text-blue-600 transition-colors">PARTIDOS</Link>
        </div>
        
      </div>
    </nav>
  );
}
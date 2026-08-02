import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-libalnna-light text-libalnna-dark p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo minimalista usando tus colores */}
        <Link href="/" className="text-2xl font-black tracking-tighter text-libalnna-blue">
          LIBALNNA<span className="text-libalnna-yellow">.</span>
        </Link>
        
        {/* Enlaces limpios */}
        <div className="flex gap-8 font-semibold text-sm tracking-wide">
          <Link href="/estadisticas" className="hover:text-libalnna-red transition-colors">ESTADÍSTICAS</Link>
          <Link href="/equipos" className="hover:text-libalnna-red transition-colors">EQUIPOS</Link>
          <Link href="/calendario" className="hover:text-libalnna-red transition-colors">CALENDARIO</Link>
        </div>
      </div>
    </nav>
  );
}
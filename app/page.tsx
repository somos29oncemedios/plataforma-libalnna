export default function Home() {
  return (
    <main className="container mx-auto flex flex-col items-center justify-center py-32 px-4">
      
      {/* Título principal */}
      <h1 className="text-5xl md:text-7xl font-black text-center mb-6 tracking-tighter">
        La liga en <span className="text-libalnna-blue">tus manos</span>
      </h1>
      
      {/* Subtítulo descriptivo */}
      <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl text-center font-medium">
        Sigue cada jugada, revisa las estadísticas en vivo y conoce el rendimiento de tus atletas favoritos. El baloncesto de Libalnna, simplificado.
      </p>
      
      {/* Botones de acción minimalistas */}
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button className="bg-libalnna-blue text-white px-8 py-3 rounded-md font-bold hover:bg-blue-800 transition-colors shadow-sm">
          Partidos de Hoy
        </button>
        <button className="bg-white text-libalnna-dark border-2 border-libalnna-dark px-8 py-3 rounded-md font-bold hover:bg-libalnna-dark hover:text-white transition-colors shadow-sm">
          Tabla de Posiciones
        </button>
      </div>
      
    </main>
  );
}
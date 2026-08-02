"use client";

import { useState } from "react";

export default function Calendario() {
  const categorias = ["U8", "U10", "U12", "U14", "U16", "U18", "U20"];
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);

  // Lista simulada de partidos para previsualizar el diseño
  const partidos = [
    {
      id: 1,
      fecha: "Sábado, 15 de Agosto",
      hora: "09:00 AM",
      cancha: "Cancha Principal - Complejo Libalnna",
      equipoLocal: "Guerreros",
      logoLocal: "",
      scoreLocal: 45,
      equipoVisitante: "Titanes",
      logoVisitante: "",
      scoreVisitante: 42,
      estado: "finalizado", // 'finalizado' o 'pendiente'
    },
    {
      id: 2,
      fecha: "Sábado, 15 de Agosto",
      hora: "11:00 AM",
      cancha: "Cancha Principal - Complejo Libalnna",
      equipoLocal: "Leones",
      logoLocal: "",
      scoreLocal: null,
      equipoVisitante: "Águilas",
      logoVisitante: "",
      scoreVisitante: null,
      estado: "pendiente",
    }
  ];

  return (
    <main className="container mx-auto py-12 px-4">
      {/* Encabezado */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-libalnna-dark uppercase tracking-tight">
            Calendario de Juegos
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Temporada Regular - Torneo Formativo</p>
        </div>
      </div>

      {/* Selector de Categorías (Pestañas) */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
              categoriaActiva === cat
                ? "bg-libalnna-blue text-white shadow-md"
                : "bg-white text-gray-500 hover:bg-gray-100 hover:text-libalnna-dark border border-gray-200"
            }`}
          >
            Categoría {cat}
          </button>
        ))}
      </div>

      {/* Lista de Partidos */}
      <div className="flex flex-col gap-6 max-w-4xl">
        {partidos.map((partido) => (
          <div key={partido.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            
            {/* Cabecera del partido (Fecha y Cancha) */}
            <div className="bg-libalnna-light px-6 py-3 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="font-bold text-libalnna-dark text-sm">{partido.fecha} • {partido.hora}</span>
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                {partido.cancha}
              </span>
            </div>

            {/* Cuerpo del partido (Equipos y Marcador) */}
            <div className="px-6 py-8 flex flex-row items-center justify-between md:justify-center md:gap-16">
              
              {/* Equipo Local */}
              <div className="flex flex-col items-center gap-3 w-1/3 md:w-auto">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0">
                  {partido.logoLocal ? (
                    <img src={partido.logoLocal} alt={partido.equipoLocal} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-gray-300 font-black text-2xl">{partido.equipoLocal.charAt(0)}</span>
                  )}
                </div>
                <span className="font-bold text-libalnna-dark text-sm md:text-base text-center uppercase">{partido.equipoLocal}</span>
              </div>

              {/* Marcador Central */}
              <div className="flex flex-col items-center justify-center w-1/3 md:w-auto">
                {partido.estado === "finalizado" ? (
                  <>
                    <div className="flex items-center gap-4 md:gap-8">
                      <span className={`text-3xl md:text-5xl font-black ${partido.scoreLocal! > partido.scoreVisitante! ? 'text-libalnna-green' : 'text-libalnna-dark'}`}>
                        {partido.scoreLocal}
                      </span>
                      <span className="text-gray-300 font-black text-xl">-</span>
                      <span className={`text-3xl md:text-5xl font-black ${partido.scoreVisitante! > partido.scoreLocal! ? 'text-libalnna-green' : 'text-libalnna-dark'}`}>
                        {partido.scoreVisitante}
                      </span>
                    </div>
                    <span className="mt-2 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">FINALIZADO</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl md:text-5xl font-black text-gray-200">VS</span>
                    <span className="mt-2 text-xs font-bold text-libalnna-blue bg-blue-50 px-3 py-1 rounded-full border border-blue-100">POR JUGAR</span>
                  </>
                )}
              </div>

              {/* Equipo Visitante */}
              <div className="flex flex-col items-center gap-3 w-1/3 md:w-auto">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0">
                  {partido.logoVisitante ? (
                    <img src={partido.logoVisitante} alt={partido.equipoVisitante} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-gray-300 font-black text-2xl">{partido.equipoVisitante.charAt(0)}</span>
                  )}
                </div>
                <span className="font-bold text-libalnna-dark text-sm md:text-base text-center uppercase">{partido.equipoVisitante}</span>
              </div>

            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
"use client";

import { useState } from "react";

export default function Equipos() {
  const listaEquipos = ["Guerreros", "Titanes", "Leones", "Águilas"];
  const [equipoActivo, setEquipoActivo] = useState(listaEquipos[0]);

  // Roster simulado de atletas para previsualizar el diseño
  const roster = [
    { id: 1, nombre: "Carlos Pérez", numero: "23", posicion: "Alero", foto: "", pts: 14.5, reb: 5.2 },
    { id: 2, nombre: "Luis Gómez", numero: "07", posicion: "Base", foto: "", pts: 18.0, reb: 2.1 },
    { id: 3, nombre: "Miguel Rojas", numero: "34", posicion: "Pívot", foto: "", pts: 9.5, reb: 11.4 },
    { id: 4, nombre: "José Silva", numero: "11", posicion: "Escolta", foto: "", pts: 12.0, reb: 3.0 },
  ];

  return (
    <main className="container mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-libalnna-dark uppercase tracking-tight">
          Rosters Oficiales
        </h1>
        <p className="text-gray-500 mt-1 font-medium">Conoce a los atletas de cada equipo</p>
      </div>

      {/* Selector de Equipos */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
        {listaEquipos.map((equipo) => (
          <button
            key={equipo}
            onClick={() => setEquipoActivo(equipo)}
            className={`px-6 py-2 rounded-md font-bold text-sm transition-all whitespace-nowrap border-2 ${
              equipoActivo === equipo
                ? "border-libalnna-blue bg-libalnna-blue text-white shadow-md"
                : "border-gray-200 bg-white text-gray-500 hover:border-libalnna-blue hover:text-libalnna-blue"
            }`}
          >
            {equipo}
          </button>
        ))}
      </div>

      {/* Tarjetas de Jugadores (Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {roster.map((jugador) => (
          <div key={jugador.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            
            {/* Foto del Atleta (Marcador de posición) */}
            <div className="h-48 bg-gray-100 flex items-center justify-center relative">
              {jugador.foto ? (
                <img src={jugador.foto} alt={jugador.nombre} className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-300 flex flex-col items-center">
                  <svg className="w-16 h-16 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  <span className="text-xs font-bold uppercase">Sin Foto</span>
                </div>
              )}
              {/* Número flotante */}
              <div className="absolute top-3 right-3 bg-libalnna-yellow text-libalnna-dark w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2 border-white shadow-sm">
                {jugador.numero}
              </div>
            </div>

            {/* Información del Atleta */}
            <div className="p-5">
              <h3 className="font-black text-xl text-libalnna-dark mb-1">{jugador.nombre}</h3>
              <p className="text-libalnna-blue font-bold text-sm mb-4">{jugador.posicion}</p>
              
              {/* Mini Estadísticas */}
              <div className="flex justify-between border-t border-gray-100 pt-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase">PTS</p>
                  <p className="font-black text-libalnna-dark">{jugador.pts}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase">REB</p>
                  <p className="font-black text-libalnna-dark">{jugador.reb}</p>
                </div>
              </div>
            </div>
            
          </div>
        ))}
      </div>
    </main>
  );
}
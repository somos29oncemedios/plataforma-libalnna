'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export default function MesaTecnicaLobby() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Jugada inicial: Buscar el calendario
  useEffect(() => {
    const fetchPartidos = async () => {
      const { data, error } = await supabase
        .from('partidos')
        .select(`
          id,
          fecha_hora,
          estado,
          fase_torneo,
          lugar,
          local:equipos!equipo_local_id(nombre),
          visitante:equipos!equipo_visitante_id(nombre)
        `)
        .order('fecha_hora', { ascending: true });

      if (data) setPartidos(data);
      setCargando(false);
    };
    fetchPartidos();
  }, []);

  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-black text-center text-gray-900 mb-8 tracking-tight">
        Mesa Técnica <span className="text-blue-600">En Vivo</span>
      </h1>

      <div className="bg-white border border-gray-200 shadow-md rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
          Seleccionar Partido
        </h2>

        {cargando ? (
          <p className="text-center text-gray-500 font-semibold py-8">Buscando programación...</p>
        ) : partidos.length === 0 ? (
          <p className="text-center text-gray-500 font-semibold py-8">No hay partidos programados en el calendario.</p>
        ) : (
          <div className="grid gap-4">
            {partidos.map((partido) => (
              <div 
                key={partido.id} 
                className="border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row justify-between items-center bg-gray-50 hover:bg-blue-50 transition-colors shadow-sm"
              >
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                    {partido.fase_torneo} • {partido.lugar}
                  </p>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    {partido.local?.nombre || 'Local'} VS {partido.visitante?.nombre || 'Visitante'}
                  </p>
                  <p className="text-sm text-gray-600 font-medium mt-1">
                    Estado: <span className="uppercase font-bold text-gray-800">{partido.estado}</span>
                  </p>
                </div>

                <Link
                  href={`/mesa-tecnica/${partido.id}`}
                  className="bg-gray-900 text-white px-8 py-3 rounded-md font-bold hover:bg-blue-600 transition-colors w-full md:w-auto text-center shadow-sm"
                >
                  Abrir Pizarra
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
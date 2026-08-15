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
          fecha,
          hora,
          estado,
          fase_torneo,
          lugar,
          categoria,
          local:equipos!equipo_local_id(nombre),
          visitante:equipos!equipo_visitante_id(nombre)
        `)
        // Orden base cronológico desde Supabase
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (data) setPartidos(data);
      setCargando(false);
    };
    fetchPartidos();
  }, []);

  const formatearFechaHora = (fechaStr: string, horaStr: string) => {
    if (!fechaStr || !horaStr) return "Fecha por definir";
    const [year, month, day] = fechaStr.split('-');
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const nombreMes = meses[parseInt(month, 10) - 1];

    let [h, m] = horaStr.split(':');
    let horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'PM' : 'AM';
    horaNum = horaNum % 12 || 12;
    const horaFormateada = `${horaNum}:${m} ${ampm}`;

    return `${day} ${nombreMes} - ${horaFormateada}`;
  };

  // 🏀 TÁCTICA: Ordenamiento Inteligente (Finalizados al fondo)
  // Creamos una copia del array (usando [...partidos]) para no mutar el estado original directamente
  const partidosOrdenados = [...partidos].sort((a, b) => {
    // Si 'a' está finalizado y 'b' no, mandamos 'a' abajo (retorna 1)
    if (a.estado === 'finalizado' && b.estado !== 'finalizado') return 1;
    // Si 'b' está finalizado y 'a' no, mandamos 'b' abajo (retorna -1)
    if (b.estado === 'finalizado' && a.estado !== 'finalizado') return -1;
    // Si tienen el mismo estado (ej: ambos programados o ambos finalizados), 
    // su orden cronológico original se mantiene porque ya vienen ordenados de Supabase.
    return 0; 
  });

  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-black text-center text-gray-900 mb-8 tracking-tight">
        Mesa Técnica <span className="text-blue-600">Lobby Central</span>
      </h1>

      <div className="bg-white border border-gray-200 shadow-md rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
          Seleccionar Partido a Anotar
        </h2>

        {cargando ? (
          <p className="text-center text-gray-500 font-semibold py-8">Buscando programación...</p>
        ) : partidosOrdenados.length === 0 ? (
          <p className="text-center text-gray-500 font-semibold py-8">No hay partidos programados en el calendario.</p>
        ) : (
          <div className="grid gap-4">
            {partidosOrdenados.map((partido) => (
              <div 
                key={partido.id} 
                className={`border rounded-lg p-6 flex flex-col md:flex-row justify-between items-center transition-colors shadow-sm ${
                  partido.estado === 'finalizado' 
                    ? 'border-gray-200 bg-gray-50 opacity-75' // Estilo apagado para finalizados
                    : 'border-blue-200 bg-white hover:bg-blue-50' // Estilo destacado para activos
                }`}
              >
                <div className="text-center md:text-left mb-4 md:mb-0 w-full md:w-2/3">
                  
                  {/* Etiquetas Superiores (Categoría, Lugar, Fecha/Hora) */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                     <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                       Cat: {partido.categoria}
                     </span>
                     <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                        ⏱️ {formatearFechaHora(partido.fecha, partido.hora)}
                     </span>
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">
                       📍 {partido.lugar}
                     </span>
                  </div>

                  {/* Nombres de los Equipos */}
                  <p className="text-xl md:text-2xl font-black text-gray-900 mt-1 leading-tight">
                    {partido.local?.nombre || 'Local'} <span className="text-gray-400 text-lg mx-2">VS</span> {partido.visitante?.nombre || 'Visitante'}
                  </p>
                  
                  {/* Estado del Torneo y Juego */}
                  <p className="text-sm text-gray-600 font-medium mt-2 flex items-center justify-center md:justify-start gap-2">
                    {partido.fase_torneo} • Estado: 
                    <span className={`uppercase font-black px-2 py-0.5 rounded text-[10px] ${
                      partido.estado === 'finalizado' ? 'bg-red-100 text-red-700' : 
                      partido.estado === 'en curso' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {partido.estado}
                    </span>
                  </p>
                </div>

                <Link
                  href={`/mesa-tecnica/${partido.id}`}
                  className={`px-8 py-3 rounded-md font-bold transition-colors w-full md:w-auto text-center shadow-sm whitespace-nowrap ${
                    partido.estado === 'finalizado'
                      ? 'bg-gray-300 text-gray-800 hover:bg-gray-400' // Botón diferente si ya terminó
                      : 'bg-gray-900 text-white hover:bg-blue-600'
                  }`}
                >
                  {partido.estado === 'finalizado' ? 'Ver / Editar' : 'Abrir Pizarra'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
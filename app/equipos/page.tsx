'use client';

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function RostersPublicos() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [equipoActivo, setEquipoActivo] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      // 1. Cargar todos los equipos oficiales
      const { data: eqData } = await supabase
        .from('equipos')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (eqData && eqData.length > 0) {
        setEquipos(eqData);
        setEquipoActivo(eqData[0]); // Mostrar el primer equipo por defecto
      }

      // 2. Cargar todos los jugadores
      const { data: jugData } = await supabase
        .from('jugadores')
        .select('*')
        .order('numero', { ascending: true });
      if (jugData) setJugadores(jugData);

      // 3. Cargar las estadísticas de TODOS los partidos jugados
      const { data: statsData } = await supabase
        .from('box_scores')
        .select('*');
      
      // 4. Sumar el rendimiento acumulado de cada jugador
      let statsMap: any = {};
      if (statsData) {
        statsData.forEach(stat => {
          if (!statsMap[stat.jugador_id]) {
            statsMap[stat.jugador_id] = { pj: 0, pts: 0, reb: 0, ast: 0, rob: 0, min: 0 };
          }
          statsMap[stat.jugador_id].pj += 1;
          statsMap[stat.jugador_id].pts += (stat.puntos_totales || 0);
          statsMap[stat.jugador_id].reb += (stat.rebotes || 0);
          statsMap[stat.jugador_id].ast += (stat.asistencias || 0);
          statsMap[stat.jugador_id].rob += (stat.recuperaciones || 0);
          statsMap[stat.jugador_id].min += (stat.minutos_jugados || 0);
        });
      }
      setEstadisticas(statsMap);
      setCargando(false);
    };

    cargarDatos();
  }, []);

  // Filtrar solo los jugadores que pertenecen al equipo seleccionado en las pestañas
  const rosterActual = jugadores.filter(j => j.equipo_id === equipoActivo?.id);

  return (
    <main className="container mx-auto py-12 px-4 max-w-6xl">
      {/* Encabezado */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Equipos y Rosters</h1>
        <p className="text-gray-500 mt-2 font-medium">Plantillas oficiales y estadísticas individuales</p>
      </div>

      {cargando ? (
        <div className="text-center py-20 text-xl font-bold text-gray-500">Cargando los vestuarios...</div>
      ) : equipos.length === 0 ? (
        <div className="text-center py-20 text-xl font-bold text-gray-500">No hay equipos registrados en la liga.</div>
      ) : (
        <>
          {/* Pestañas de Equipos */}
          <div className="flex overflow-x-auto gap-3 mb-10 pb-2 scrollbar-hide">
            {equipos.map((equipo) => (
              <button
                key={equipo.id}
                onClick={() => setEquipoActivo(equipo)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all whitespace-nowrap border-2 ${
                  equipoActivo?.id === equipo.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
                }`}
              >
                {equipo.logo_url && (
                  <img src={equipo.logo_url} alt={equipo.nombre} className="w-5 h-5 object-contain rounded-full bg-white" />
                )}
                {equipo.nombre}
              </button>
            ))}
          </div>

          {/* Información del Equipo Seleccionado */}
          <div className="bg-gray-900 rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-lg">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shrink-0 border-4 border-gray-800 p-2">
              {equipoActivo?.logo_url ? (
                <img src={equipoActivo.logo_url} alt={equipoActivo.nombre} className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-300 font-black text-4xl">{equipoActivo?.nombre.charAt(0)}</span>
              )}
            </div>
            <div className="text-center md:text-left text-white">
              <h2 className="text-3xl font-black uppercase tracking-wide">{equipoActivo?.nombre}</h2>
              <p className="text-blue-400 font-semibold mt-1">Categorías: {equipoActivo?.categorias?.join(', ') || 'General'}</p>
            </div>
          </div>

          {/* Tarjetas de Jugadores (Roster) */}
          {rosterActual.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 font-semibold">Este equipo aún no ha fichado jugadores en su plantilla.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rosterActual.map((jugador) => {
                const stats = estadisticas[jugador.id] || { pj: 0, pts: 0, reb: 0, ast: 0, rob: 0, min: 0 };
                // Calcular promedios (si ha jugado partidos)
                const ppp = stats.pj > 0 ? (stats.pts / stats.pj).toFixed(1) : "0.0";
                const rpp = stats.pj > 0 ? (stats.reb / stats.pj).toFixed(1) : "0.0";
                const app = stats.pj > 0 ? (stats.ast / stats.pj).toFixed(1) : "0.0";

                return (
                  <div key={jugador.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    {/* Foto y Número */}
                    <div className="relative h-48 bg-gray-100 flex items-center justify-center border-b border-gray-200">
                      {jugador.foto_url ? (
                        <img src={jugador.foto_url} alt={jugador.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-300 font-black text-6xl">#{jugador.numero}</span>
                      )}
                      <div className="absolute bottom-[-16px] right-4 w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black shadow-sm transform -rotate-3 border-2 border-white">
                        {jugador.numero}
                      </div>
                    </div>
                    
                    {/* Nombre del Jugador */}
                    <div className="px-5 pt-6 pb-4">
                      <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight truncate" title={jugador.nombre}>
                        {jugador.nombre}
                      </h3>
                      <p className="text-xs font-semibold text-gray-500 mt-1">PJ: {stats.pj} • MIN: {stats.min}</p>
                    </div>

                    {/* Estadísticas Promedio (Footer de la tarjeta) */}
                    <div className="bg-gray-50 grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-100 mt-auto">
                      <div className="p-3 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PTS</p>
                        <p className="font-bold text-gray-800">{ppp}</p>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">REB</p>
                        <p className="font-bold text-gray-800">{rpp}</p>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AST</p>
                        <p className="font-bold text-gray-800">{app}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
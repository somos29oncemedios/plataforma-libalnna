'use client';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { supabase } from "../supabase";

function ListaEquipos() {
  const searchParams = useSearchParams();
  const equipoIdUrl = searchParams.get('id'); 

  const [equipos, setEquipos] = useState<any[]>([]);
  const [equipoActivo, setEquipoActivo] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: eqData } = await supabase
        .from('equipos')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (eqData && eqData.length > 0) {
        setEquipos(eqData);
        
        const { data: jugData } = await supabase
          .from('jugadores')
          .select('*')
          .order('numero', { ascending: true });
        if (jugData) setJugadores(jugData);

        const { data: statsData } = await supabase
          .from('box_scores')
          .select('*');
        
        let statsMap: any = {};
        if (statsData) {
          // 🏀 CORRECCIÓN AQUÍ: (stat: any)
          statsData.forEach((stat: any) => {
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
      }
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    if (equipos.length > 0) {
      if (equipoIdUrl) {
        // 🏀 CORRECCIÓN AQUÍ: (e: any)
        const equipoSeleccionado = equipos.find((e: any) => e.id.toString() === equipoIdUrl);
        setEquipoActivo(equipoSeleccionado || equipos[0]);
      } else {
        setEquipoActivo(equipos[0]);
      }
    }
  }, [equipos, equipoIdUrl]); 

  // 🏀 CORRECCIÓN AQUÍ: (j: any)
  const rosterActual = jugadores.filter((j: any) => j.equipo_id === equipoActivo?.id);

  return (
    <main className="container mx-auto py-12 px-4 max-w-6xl">
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
          <div className="flex overflow-x-auto gap-3 mb-10 pb-2 scrollbar-hide">
            {/* 🏀 CORRECCIÓN AQUÍ: (equipo: any) */}
            {equipos.map((equipo: any) => (
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

          {rosterActual.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 font-semibold">Este equipo aún no ha fichado jugadores en su plantilla.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* 🏀 CORRECCIÓN AQUÍ: (jugador: any) */}
              {rosterActual.map((jugador: any) => {
                const stats = estadisticas[jugador.id] || { pj: 0, pts: 0, reb: 0, ast: 0, rob: 0, min: 0 };
                const ppp = stats.pj > 0 ? (stats.pts / stats.pj).toFixed(1) : "0.0";
                const rpp = stats.pj > 0 ? (stats.reb / stats.pj).toFixed(1) : "0.0";
                const app = stats.pj > 0 ? (stats.ast / stats.pj).toFixed(1) : "0.0";

                return (
                  <div key={jugador.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
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
                    
                    <div className="px-5 pt-6 pb-4">
                      <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight truncate" title={jugador.nombre}>
                        {jugador.nombre}
                      </h3>
                      <p className="text-xs font-semibold text-gray-500 mt-1">PJ: {stats.pj} • MIN: {stats.min}</p>
                    </div>

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

export default function RostersPublicos() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-bold text-gray-500">Buscando en los vestuarios...</div>}>
      <ListaEquipos />
    </Suspense>
  );
}
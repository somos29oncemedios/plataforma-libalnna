'use client';

import { useState, useEffect, Suspense, useMemo } from "react";
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

  // NUEVO ESTADO: Categoría activa para el equipo seleccionado
  const [categoriaActiva, setCategoriaActiva] = useState<string>("Todas");

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
        const equipoSeleccionado = equipos.find((e: any) => e.id.toString() === equipoIdUrl);
        setEquipoActivo(equipoSeleccionado || equipos[0]);
      } else {
        setEquipoActivo(equipos[0]);
      }
      // Al cambiar de equipo, reseteamos el filtro de categoría a "Todas"
      setCategoriaActiva("Todas");
    }
  }, [equipos, equipoIdUrl]); 

  // Todos los jugadores del equipo activo
  const rosterCompletoEquipo = useMemo(() => {
    return jugadores.filter((j: any) => j.equipo_id === equipoActivo?.id);
  }, [jugadores, equipoActivo]);

  // Extraemos dinámicamente las categorías únicas de ESTE equipo
  const categoriasDisponibles = useMemo(() => {
    const cats = new Set<string>();
    rosterCompletoEquipo.forEach((jugador: any) => {
      if (Array.isArray(jugador.categorias)) {
        // Solución: Le decimos a TypeScript que 'c' es un string
        jugador.categorias.forEach((c: string) => cats.add(c));
      } else if (jugador.categoria) {
        cats.add(jugador.categoria); // Soporte por si usan un string
      }
    });
    return ["Todas", ...Array.from(cats)].sort(); 
  }, [rosterCompletoEquipo]);

  // Filtramos el roster basándonos en la categoría activa
  const rosterFiltrado = useMemo(() => {
    if (categoriaActiva === "Todas") return rosterCompletoEquipo;
    
    return rosterCompletoEquipo.filter((jugador) => {
       if (Array.isArray(jugador.categorias)) {
           return jugador.categorias.includes(categoriaActiva);
       }
       return jugador.categoria === categoriaActiva;
    });
  }, [rosterCompletoEquipo, categoriaActiva]);


  return (
    <main className="container mx-auto py-8 md:py-12 px-4 max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 md:mb-10 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight">Equipos y Rosters</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2 font-medium">Plantillas oficiales y estadísticas individuales</p>
      </div>

      {cargando ? (
        <div className="text-center py-20 text-lg md:text-xl font-bold text-gray-500">Cargando los vestuarios...</div>
      ) : equipos.length === 0 ? (
        <div className="text-center py-20 text-lg md:text-xl font-bold text-gray-500">No hay equipos registrados en la liga.</div>
      ) : (
        <>
          {/* Pestañas de Equipos */}
          <div className="flex overflow-x-auto gap-2 md:gap-3 mb-8 md:mb-10 pb-2 scrollbar-hide">
            {equipos.map((equipo: any) => (
              <button
                key={equipo.id}
                onClick={() => {
                  setEquipoActivo(equipo);
                  setCategoriaActiva("Todas"); // Resetear al cambiar equipo
                }}
                className={`flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-xs md:text-sm transition-all whitespace-nowrap border-2 ${
                  equipoActivo?.id === equipo.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
                }`}
              >
                {equipo.logo_url && (
                  <img src={equipo.logo_url} alt={equipo.nombre} className="w-4 h-4 md:w-5 md:h-5 object-contain rounded-full bg-white" />
                )}
                {equipo.nombre}
              </button>
            ))}
          </div>

          {/* Información del Equipo Seleccionado (Banner) */}
          <div className="bg-gray-900 rounded-2xl p-6 md:p-8 mb-6 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-lg">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shrink-0 border-4 border-gray-800 p-2">
              {equipoActivo?.logo_url ? (
                <img src={equipoActivo.logo_url} alt={equipoActivo.nombre} className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-300 font-black text-3xl md:text-4xl">{equipoActivo?.nombre.charAt(0)}</span>
              )}
            </div>
            <div className="text-center md:text-left text-white flex-1">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wide">{equipoActivo?.nombre}</h2>
              <p className="text-blue-400 font-semibold text-sm md:text-base mt-1">Categorías Registradas: {equipoActivo?.categorias?.join(', ') || 'General'}</p>
            </div>
          </div>

          {/* NUEVO: Selector de Categorías Dinámico (Solo aparece si el equipo tiene más de 1 categoría) */}
          {categoriasDisponibles.length > 2 && ( 
             <div className="flex overflow-x-auto gap-2 md:gap-3 mb-6 pb-2 scrollbar-hide justify-center md:justify-start">
               {categoriasDisponibles.map(cat => (
                 <button
                    key={cat}
                    onClick={() => setCategoriaActiva(cat)}
                    className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
                      categoriaActiva === cat
                        ? "bg-gray-800 text-white shadow-sm"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                 >
                    {cat}
                 </button>
               ))}
             </div>
          )}

          {/* Tarjetas de Jugadores (Roster) - Ajuste Móvil: grid-cols-2 */}
          {rosterFiltrado.length === 0 ? (
            <div className="text-center py-12 md:py-16 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 font-semibold text-sm md:text-base">
                {categoriaActiva === "Todas" 
                  ? "Este equipo aún no ha fichado jugadores en su plantilla."
                  : `No hay jugadores registrados en la categoría ${categoriaActiva}.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
              {rosterFiltrado.map((jugador: any) => {
                const stats = estadisticas[jugador.id] || { pj: 0, pts: 0, reb: 0, ast: 0, rob: 0, min: 0 };
                const ppp = stats.pj > 0 ? (stats.pts / stats.pj).toFixed(1) : "0.0";
                const rpp = stats.pj > 0 ? (stats.reb / stats.pj).toFixed(1) : "0.0";
                const app = stats.pj > 0 ? (stats.ast / stats.pj).toFixed(1) : "0.0";

                return (
                  <div key={jugador.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    
                    {/* Foto y Número del Jugador */}
                    <div className="relative h-36 md:h-48 bg-gray-100 flex items-center justify-center border-b border-gray-200">
                      {jugador.foto_url ? (
                        <img src={jugador.foto_url} alt={jugador.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-300 font-black text-4xl md:text-6xl">#{jugador.numero}</span>
                      )}
                      <div className="absolute bottom-[-12px] md:bottom-[-16px] right-2 md:right-4 w-8 h-8 md:w-10 md:h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black shadow-sm transform -rotate-3 border-2 border-white text-xs md:text-base">
                        {jugador.numero}
                      </div>
                    </div>
                    
                    {/* Datos del Jugador */}
                    <div className="px-3 md:px-5 pt-4 md:pt-6 pb-3 md:pb-4">
                      <h3 className="font-black text-gray-900 text-sm md:text-lg uppercase tracking-tight truncate" title={jugador.nombre}>
                        {jugador.nombre}
                      </h3>
                      <p className="text-[10px] md:text-xs font-semibold text-gray-500 mt-0.5 md:mt-1">PJ: {stats.pj} • MIN: {stats.min}</p>
                    </div>

                    {/* Estadísticas (Promedios) */}
                    <div className="bg-gray-50 grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-100 mt-auto">
                      <div className="p-2 md:p-3 text-center">
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">PTS</p>
                        <p className="font-bold text-gray-800 text-sm md:text-base">{ppp}</p>
                      </div>
                      <div className="p-2 md:p-3 text-center">
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">REB</p>
                        <p className="font-bold text-gray-800 text-sm md:text-base">{rpp}</p>
                      </div>
                      <div className="p-2 md:p-3 text-center">
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">AST</p>
                        <p className="font-bold text-gray-800 text-sm md:text-base">{app}</p>
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
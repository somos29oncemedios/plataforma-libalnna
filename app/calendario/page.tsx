'use client';

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function Calendario() {
  const categorias = ["Todas", "U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];
  
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);
  // NUEVO: Estado para controlar qué sección (renglón) estamos viendo
  const [seccionActiva, setSeccionActiva] = useState<"proximos" | "resultados">("proximos");
  
  const [partidos, setPartidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchPartidos = async () => {
      // La consulta ya está ordenada cronológicamente por día y hora
      const { data, error } = await supabase
        .from('partidos')
        .select(`
          id, fecha, hora, estado, fase_torneo, lugar, categoria, puntos_local, puntos_visitante,
          local:equipos!equipo_local_id(nombre, logo_url),
          visitante:equipos!equipo_visitante_id(nombre, logo_url)
        `)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (data) {
        setPartidos(data);
      }
      setCargando(false);
    };

    fetchPartidos();
  }, []);

  const formatearFechaHora = (fechaStr: string, horaStr: string) => {
    if (!fechaStr || !horaStr) return "Fecha por definir";
    const [year, month, day] = fechaStr.split('-');
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const nombreMes = meses[parseInt(month, 10) - 1];

    let [h, m] = horaStr.split(':');
    let horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'PM' : 'AM';
    horaNum = horaNum % 12 || 12;
    const horaFormateada = `${horaNum}:${m} ${ampm}`;

    return `${horaFormateada}, ${day} ${nombreMes} ${year}`;
  };

  // 1. Filtrar por Categoría
  const partidosPorCategoria = categoriaActiva === "Todas"
    ? partidos
    : partidos.filter(partido => partido.categoria === categoriaActiva);

  // 2. Filtrar por Sección (Próximos vs Resultados)
  const partidosAMostrar = partidosPorCategoria.filter(partido => {
    if (seccionActiva === "resultados") {
      return partido.estado === "finalizado";
    } else {
      // Incluye "programado", "en curso", o cualquier cosa que no sea "finalizado"
      return partido.estado !== "finalizado";
    }
  });

  return (
    <main className="container mx-auto py-8 md:py-12 px-4 max-w-5xl">
      {/* Encabezado */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 text-center md:text-left">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
            Calendario de Juegos
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1 font-medium">Temporada Regular - Torneo Formativo</p>
        </div>
      </div>

      {/* Selector de Categorias */}
      <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-hide">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-5 py-2 md:px-6 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
              categoriaActiva === cat
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
            }`}
          >
            {cat === "Todas" ? "Todas las Categorías" : `Categoría ${cat}`}
          </button>
        ))}
      </div>

      {/* NUEVO: Selector de Sección (Próximos vs Resultados) */}
      <div className="flex justify-center md:justify-start gap-4 mb-8 border-b border-gray-200 pb-4">
        <button
          onClick={() => setSeccionActiva("proximos")}
          className={`px-6 py-2 rounded-lg font-black text-sm uppercase tracking-wide transition-all ${
            seccionActiva === "proximos"
              ? "bg-gray-900 text-white shadow-md"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Próximos Partidos
        </button>
        <button
          onClick={() => setSeccionActiva("resultados")}
          className={`px-6 py-2 rounded-lg font-black text-sm uppercase tracking-wide transition-all ${
            seccionActiva === "resultados"
              ? "bg-green-600 text-white shadow-md"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Resultados
        </button>
      </div>

      {/* Lista de Partidos */}
      {cargando ? (
        <div className="text-center py-20 text-lg md:text-xl font-bold text-gray-500">Cargando la cartelera oficial...</div>
      ) : partidosAMostrar.length === 0 ? (
        <div className="text-center py-20 text-lg md:text-xl font-bold text-gray-500 px-4">
          No hay {seccionActiva === "resultados" ? "resultados registrados" : "partidos programados"} {categoriaActiva !== "Todas" ? `para la Categoría ${categoriaActiva}` : "aún"}.
        </div>
      ) : (
        <div className="flex flex-col gap-5 md:gap-6">
          {partidosAMostrar.map((partido) => (
            <div key={partido.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              
              {/* Cabecera del partido */}
              <div className="bg-gray-50 px-4 md:px-6 py-3 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2 text-center sm:text-left">
                <span className="font-bold text-gray-900 text-[13px] md:text-sm tracking-wide">
                  {formatearFechaHora(partido.fecha, partido.hora)}
                </span>
                <span className="text-[10px] md:text-xs font-semibold text-gray-500 flex flex-wrap justify-center sm:justify-end items-center gap-1 uppercase tracking-wider">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  {partido.lugar} <span className="hidden sm:inline">•</span> 
                  <span className="text-blue-600 font-bold ml-1 sm:ml-0">{partido.categoria}</span> 
                  <span className="hidden sm:inline">•</span> 
                  <span className="ml-1 sm:ml-0">{partido.fase_torneo}</span>
                </span>
              </div>

              {/* Cuerpo del partido (Equipos y Marcador) */}
              <div className="px-3 py-6 md:px-6 md:py-8 flex flex-row items-center justify-between md:justify-center md:gap-16">
                
                {/* Equipo Local */}
                <div className="flex flex-col items-center gap-2 md:gap-3 w-[35%] md:w-auto">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0">
                    {partido.local?.logo_url ? (
                      <img src={partido.local.logo_url} alt={partido.local.nombre} className="w-full h-full object-contain p-1 rounded-full" />
                    ) : (
                      <span className="text-gray-300 font-black text-xl md:text-2xl">{partido.local?.nombre?.charAt(0) || 'L'}</span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900 text-[11px] sm:text-sm md:text-base text-center uppercase leading-tight line-clamp-2 md:line-clamp-none">{partido.local?.nombre || 'Local'}</span>
                </div>

                {/* Marcador Central Dinámico */}
                <div className="flex flex-col items-center justify-center w-[30%] md:w-auto">
                  {partido.estado === "finalizado" ? (
                    <>
                      <div className="flex items-center gap-2 md:gap-6">
                        <span className="text-2xl sm:text-3xl md:text-5xl font-black text-gray-900">{partido.puntos_local ?? 0}</span>
                        <span className="text-gray-300 font-black text-lg md:text-xl">-</span>
                        <span className="text-2xl sm:text-3xl md:text-5xl font-black text-gray-900">{partido.puntos_visitante ?? 0}</span>
                      </div>
                      <span className="mt-1 md:mt-2 text-[9px] md:text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 md:px-3 rounded-full border border-gray-100 text-center leading-none">FINALIZADO</span>
                    </>
                  ) : partido.estado === "en curso" ? (
                    <>
                      <span className="text-2xl sm:text-3xl md:text-5xl font-black text-green-500">VIVO</span>
                      <span className="mt-1 md:mt-2 text-[9px] md:text-xs font-bold text-green-600 bg-green-50 px-2 py-1 md:px-3 rounded-full border border-green-200 text-center leading-none">JUGANDO</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl sm:text-3xl md:text-5xl font-black text-gray-200">VS</span>
                      <span className="mt-1 md:mt-2 text-[9px] md:text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 md:px-3 rounded-full border border-blue-200 text-center leading-none">POR JUGAR</span>
                    </>
                  )}
                </div>

                {/* Equipo Visitante */}
                <div className="flex flex-col items-center gap-2 md:gap-3 w-[35%] md:w-auto">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0">
                    {partido.visitante?.logo_url ? (
                      <img src={partido.visitante.logo_url} alt={partido.visitante.nombre} className="w-full h-full object-contain p-1 rounded-full" />
                    ) : (
                      <span className="text-gray-300 font-black text-xl md:text-2xl">{partido.visitante?.nombre?.charAt(0) || 'V'}</span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900 text-[11px] sm:text-sm md:text-base text-center uppercase leading-tight line-clamp-2 md:line-clamp-none">{partido.visitante?.nombre || 'Visitante'}</span>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
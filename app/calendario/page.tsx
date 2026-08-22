'use client';

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function Calendario() {
  const categorias = ["Todas", "U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];
  
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);
  const [seccionActiva, setSeccionActiva] = useState<"proximos" | "resultados">("proximos");
  
  const [partidos, setPartidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchPartidos = async () => {
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

  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return "Fecha por definir";
    const [year, month, day] = fechaStr.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const nombreDia = diasSemana[dateObj.getDay()];
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const nombreMes = meses[parseInt(month, 10) - 1];
    
    return `${nombreDia}, ${day} de ${nombreMes} de ${year}`;
  };

  const formatearHora = (horaStr: string) => {
    if (!horaStr) return "Hora por definir";
    let [h, m] = horaStr.split(':');
    let horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'PM' : 'AM';
    horaNum = horaNum % 12 || 12;
    return `${horaNum}:${m} ${ampm}`;
  };

  // 1. Filtrar por Categoría
  const partidosPorCategoria = categoriaActiva === "Todas"
    ? partidos
    : partidos.filter(partido => partido.categoria === categoriaActiva);

  // 2. Filtrar por Sección (Próximos vs Resultados)
  // 🔥 AJUSTE: Los partidos suspendidos ahora se van a Resultados
  let partidosAMostrar = partidosPorCategoria.filter(partido => {
    if (seccionActiva === "resultados") {
      return partido.estado === "finalizado" || partido.estado === "suspendido";
    } else {
      return partido.estado !== "finalizado" && partido.estado !== "suspendido";
    }
  });

  // Si estamos viendo los Resultados, invertimos el arreglo
  if (seccionActiva === "resultados") {
    partidosAMostrar = partidosAMostrar.reverse();
  }

  // 3. Agrupación Doble (FECHA -> SEDE)
  const partidosAgrupados = partidosAMostrar.reduce((agrupacion: any, partido) => {
    const fecha = partido.fecha || "Fecha por definir";
    const sede = partido.lugar || "Sede por definir";

    if (!agrupacion[fecha]) {
      agrupacion[fecha] = {};
    }
    if (!agrupacion[fecha][sede]) {
      agrupacion[fecha][sede] = [];
    }
    
    agrupacion[fecha][sede].push(partido);
    return agrupacion;
  }, {});

  return (
    <main className="container mx-auto py-6 md:py-12 px-3 md:px-4 max-w-5xl">
      {/* Encabezado */}
      <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4 text-center md:text-left">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
            Calendario de Juegos
          </h1>
          <p className="text-xs md:text-base text-gray-500 mt-1 font-medium">Temporada Regular - Torneo Formativo</p>
        </div>
      </div>

      {/* Selector de Categorías */}
      <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-hide">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
              categoriaActiva === cat
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
            }`}
          >
            {cat === "Todas" ? "Todas las Categorías" : `Categoría ${cat}`}
          </button>
        ))}
      </div>

      {/* Selector de Sección (Próximos vs Resultados) */}
      <div className="flex justify-center md:justify-start gap-2 md:gap-4 mb-6 md:mb-8 border-b border-gray-200 pb-4">
        <button
          onClick={() => setSeccionActiva("proximos")}
          className={`px-4 py-2 md:px-6 rounded-lg font-black text-xs md:text-sm uppercase tracking-wide transition-all ${
            seccionActiva === "proximos"
              ? "bg-gray-900 text-white shadow-md"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Próximos Partidos
        </button>
        <button
          onClick={() => setSeccionActiva("resultados")}
          className={`px-4 py-2 md:px-6 rounded-lg font-black text-xs md:text-sm uppercase tracking-wide transition-all ${
            seccionActiva === "resultados"
              ? "bg-green-600 text-white shadow-md"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Resultados
        </button>
      </div>

      {/* Lista de Partidos Agrupados */}
      {cargando ? (
        <div className="text-center py-10 md:py-20 text-base md:text-xl font-bold text-gray-500">Cargando la cartelera oficial...</div>
      ) : Object.keys(partidosAgrupados).length === 0 ? (
        <div className="text-center py-10 md:py-20 text-base md:text-xl font-bold text-gray-500 px-4">
          No hay {seccionActiva === "resultados" ? "resultados registrados" : "partidos programados"} {categoriaActiva !== "Todas" ? `para la Categoría ${categoriaActiva}` : "aún"}.
        </div>
      ) : (
        <div className="flex flex-col gap-8 md:gap-12">
          {Object.entries(partidosAgrupados).map(([fecha, sedes]: [string, any]) => (
            <div key={fecha} className="flex flex-col gap-3 md:gap-4">
              
              {/* Título Principal: DÍA */}
              <div className="inline-block self-center md:self-start border-b-2 border-gray-900 pb-2 w-full">
                <h2 className="text-lg md:text-2xl font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  📅 <span>{formatearFecha(fecha)}</span>
                </h2>
              </div>

              {/* Sedes dentro de ese Día */}
              <div className="flex flex-col gap-6 pl-0 md:pl-4 mt-1">
                {Object.entries(sedes).map(([sede, partidosDeSede]: [string, any]) => (
                  <div key={sede} className="flex flex-col gap-3">
                    
                    {/* Subtítulo: SEDE */}
                    <div className="flex items-center gap-2 border-b border-gray-200 pb-1.5">
                      <span className="text-lg md:text-xl">📍</span>
                      <h3 className="text-base md:text-xl font-bold text-gray-800 uppercase tracking-wide">
                        Sede: <span className="text-blue-600">{sede}</span>
                      </h3>
                    </div>

                    {/* Partidos de esa Sede */}
                    <div className="flex flex-col gap-3 md:gap-6 mt-1">
                      {partidosDeSede.map((partido: any) => (
                        <div key={partido.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                          
                          <div className="bg-gray-50 px-3 py-2 md:px-6 md:py-3 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-1 text-center sm:text-left">
                            <span className="font-black text-blue-600 text-[11px] md:text-sm tracking-wide">
                              ⏱️ {formatearHora(partido.hora)}
                            </span>
                            <span className="text-[9px] md:text-xs font-semibold text-gray-500 flex flex-wrap justify-center sm:justify-end items-center gap-1 uppercase tracking-wider">
                              <span className="text-blue-600 font-bold">{partido.categoria}</span> 
                              <span className="hidden sm:inline">•</span> 
                              <span>{partido.fase_torneo}</span>
                            </span>
                          </div>

                          <div className="px-2 py-3 md:px-6 md:py-8 grid grid-cols-3 items-start w-full gap-1 md:gap-2">
                            
                            <div className="flex flex-col items-center gap-1 md:gap-3">
                              <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0 overflow-hidden shadow-sm">
                                {partido.local?.logo_url ? (
                                  <img src={partido.local.logo_url} alt={partido.local.nombre} className="w-full h-full object-contain p-1" />
                                ) : (
                                  <span className="text-gray-300 font-black text-lg md:text-2xl">{partido.local?.nombre?.charAt(0) || 'L'}</span>
                                )}
                              </div>
                              <span className="font-bold text-gray-900 text-[9px] sm:text-sm md:text-base text-center uppercase leading-tight px-0.5">
                                {partido.local?.nombre || 'Local'}
                              </span>
                            </div>

                            <div className="flex flex-col items-center justify-start pt-1 md:pt-4">
                              {/* 🔥 NUEVA LÓGICA DE RENDERIZADO PARA INCLUIR ESTADO "SUSPENDIDO" */}
                              {partido.estado === "finalizado" ? (
                                <>
                                  <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
                                    <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{partido.puntos_local ?? 0}</span>
                                    <span className="text-gray-300 font-black text-sm md:text-2xl">-</span>
                                    <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{partido.puntos_visitante ?? 0}</span>
                                  </div>
                                  <span className="mt-1 md:mt-2 text-[7px] md:text-xs font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 md:px-3 md:py-1 rounded-full border border-gray-100 text-center leading-none">FINALIZADO</span>
                                </>
                              ) : partido.estado === "suspendido" ? (
                                <>
                                  <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
                                    <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-400 tracking-tighter">{partido.puntos_local ?? 0}</span>
                                    <span className="text-gray-300 font-black text-sm md:text-2xl">-</span>
                                    <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-400 tracking-tighter">{partido.puntos_visitante ?? 0}</span>
                                  </div>
                                  <span className="mt-1 md:mt-2 text-[7px] md:text-xs font-bold text-yellow-800 bg-yellow-100 px-1.5 py-0.5 md:px-3 md:py-1 rounded-full border border-yellow-300 text-center leading-none shadow-sm">SUSPENDIDO</span>
                                </>
                              ) : partido.estado === "en curso" ? (
                                <>
                                  <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
                                    <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{partido.puntos_local ?? 0}</span>
                                    <span className="text-gray-300 font-black text-sm md:text-2xl">-</span>
                                    <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{partido.puntos_visitante ?? 0}</span>
                                  </div>
                                  <div className="mt-1 md:mt-2 flex flex-col items-center gap-0.5 md:gap-1">
                                    <span className="text-[8px] md:text-xs font-black text-red-500 animate-pulse flex items-center gap-1"><span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full"></span> EN VIVO</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-200">VS</span>
                                  <span className="mt-1 md:mt-2 text-[7px] md:text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 md:px-3 md:py-1 rounded-full border border-blue-200 text-center leading-none">POR JUGAR</span>
                                </>
                              )}
                            </div>

                            <div className="flex flex-col items-center gap-1 md:gap-3">
                              <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0 overflow-hidden shadow-sm">
                                {partido.visitante?.logo_url ? (
                                  <img src={partido.visitante.logo_url} alt={partido.visitante.nombre} className="w-full h-full object-contain p-1" />
                                ) : (
                                  <span className="text-gray-300 font-black text-lg md:text-2xl">{partido.visitante?.nombre?.charAt(0) || 'V'}</span>
                                )}
                              </div>
                              <span className="font-bold text-gray-900 text-[9px] sm:text-sm md:text-base text-center uppercase leading-tight px-0.5">
                                {partido.visitante?.nombre || 'Visitante'}
                              </span>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}
    </main>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export default function MesaTecnicaLobby() {
  const categorias = ["Todas", "U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];

  const [partidos, setPartidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);
  const [seccionActiva, setSeccionActiva] = useState<"activos" | "finalizados" | "todos">("activos");

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
          puntos_local,
          puntos_visitante,
          local:equipos!equipo_local_id(nombre, logo_url),
          visitante:equipos!equipo_visitante_id(nombre, logo_url)
        `)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (data) setPartidos(data);
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
    : partidos.filter(p => p.categoria === categoriaActiva);

  // 2. Filtrar por Sección (Activos/Por Jugar vs Finalizados vs Todos)
  let partidosFiltrados = partidosPorCategoria.filter(p => {
    if (seccionActiva === "activos") {
      return p.estado !== "finalizado" && p.estado !== "borrador";
    }
    if (seccionActiva === "finalizados") {
      return p.estado === "finalizado";
    }
    return p.estado !== "borrador"; // 'todos'
  });

  // Si estamos en finalizados, podemos invertir para ver los más recientes primero
  if (seccionActiva === "finalizados") {
    partidosFiltrados = [...partidosFiltrados].reverse();
  }

  // 3. Agrupación Doble: FECHA -> SEDE -> PARTIDOS
  const partidosAgrupados = partidosFiltrados.reduce((agrupacion: any, partido) => {
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

  // Contadores para las pestañas
  const totalActivos = partidosPorCategoria.filter(p => p.estado !== "finalizado" && p.estado !== "borrador").length;
  const totalFinalizados = partidosPorCategoria.filter(p => p.estado === "finalizado").length;
  const totalTodos = partidosPorCategoria.filter(p => p.estado !== "borrador").length;

  return (
    <main className="container mx-auto px-3 md:px-4 py-8 md:py-14 max-w-5xl">
      {/* Encabezado */}
      <div className="text-center mb-8">
        <span className="bg-blue-100 text-blue-800 text-xs font-black px-4 py-1.5 rounded-full tracking-widest uppercase shadow-sm">
          Panel de Control
        </span>
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tight mt-3">
          Mesa Técnica <span className="text-blue-600">Lobby Central</span>
        </h1>
        <p className="text-gray-500 font-bold mt-2 text-sm md:text-base">
          Selecciona un partido organizado por sede y horario para abrir la pizarra de anotación.
        </p>
      </div>

      {/* Selector de Categorías (Scroll horizontal) */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 justify-start md:justify-center scrollbar-hide">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-4 py-2 rounded-full font-black text-xs md:text-sm uppercase tracking-wider transition-all whitespace-nowrap ${
              categoriaActiva === cat
                ? "bg-blue-600 text-white shadow-md scale-105"
                : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 shadow-sm"
            }`}
          >
            {cat === "Todas" ? "Todas las Categorías" : cat}
          </button>
        ))}
      </div>

      {/* Selector de Sección (Por Jugar / En Vivo vs Finalizados vs Todos) */}
      <div className="flex justify-center gap-2 md:gap-4 mb-8 border-b border-gray-200 pb-4">
        <button
          onClick={() => setSeccionActiva("activos")}
          className={`px-4 py-2.5 md:px-6 rounded-xl font-black text-xs md:text-sm uppercase tracking-wide transition-all flex items-center gap-2 ${
            seccionActiva === "activos"
              ? "bg-gray-900 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <span>🏀 Por Jugar / En Vivo</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            seccionActiva === "activos" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
          }`}>
            {totalActivos}
          </span>
        </button>

        <button
          onClick={() => setSeccionActiva("finalizados")}
          className={`px-4 py-2.5 md:px-6 rounded-xl font-black text-xs md:text-sm uppercase tracking-wide transition-all flex items-center gap-2 ${
            seccionActiva === "finalizados"
              ? "bg-green-600 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <span>🏁 Finalizados</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            seccionActiva === "finalizados" ? "bg-green-800 text-white" : "bg-gray-200 text-gray-700"
          }`}>
            {totalFinalizados}
          </span>
        </button>

        <button
          onClick={() => setSeccionActiva("todos")}
          className={`px-4 py-2.5 md:px-6 rounded-xl font-black text-xs md:text-sm uppercase tracking-wide transition-all flex items-center gap-2 ${
            seccionActiva === "todos"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <span>📋 Todos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            seccionActiva === "todos" ? "bg-blue-800 text-white" : "bg-gray-200 text-gray-700"
          }`}>
            {totalTodos}
          </span>
        </button>
      </div>

      {/* Lista de Partidos Agrupados */}
      {cargando ? (
        <div className="text-center py-20 font-bold text-gray-500 text-lg animate-pulse">
          Cargando partidos de la Mesa Técnica...
        </div>
      ) : Object.keys(partidosAgrupados).length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-500 font-bold">
          <p className="text-xl mb-1">🏀 Sin partidos para mostrar</p>
          <p className="text-sm text-gray-400">
            No se encontraron partidos {seccionActiva === "activos" ? "activos o por jugar" : seccionActiva === "finalizados" ? "finalizados" : ""} en la categoría seleccionada.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 md:gap-10">
          {Object.entries(partidosAgrupados).map(([fecha, sedes]: [string, any]) => (
            <div key={fecha} className="flex flex-col gap-6">
              
              {/* Sedes dentro de ese Día */}
              {Object.entries(sedes).map(([sede, partidosDeSede]: [string, any]) => (
                <div key={sede} className="flex flex-col gap-3">
                  
                  {/* Encabezado: SEDE Y FECHA */}
                  <div className="flex items-center flex-wrap gap-2 border-b-2 border-gray-200 pb-2">
                    <span className="text-xl">📍</span>
                    <h3 className="text-base md:text-xl font-black text-gray-900 uppercase tracking-wide flex items-center flex-wrap gap-2">
                      <span>Sede: <span className="text-blue-600">{sede}</span></span>
                      <span className="text-gray-300 text-sm hidden md:inline-block">|</span>
                      <span className="text-gray-600 text-xs bg-gray-100 px-3 py-1 rounded-md tracking-normal normal-case font-bold border border-gray-200 shadow-sm">
                        📅 {formatearFecha(fecha)}
                      </span>
                    </h3>
                  </div>

                  {/* Partidos de esa Sede (Ordenados por hora) */}
                  <div className="flex flex-col gap-3 md:gap-4 mt-1">
                    {partidosDeSede.map((partido: any) => {
                      const esEnCurso = partido.estado === 'en curso';
                      const esSuspendido = partido.estado === 'suspendido';
                      const esFinalizado = partido.estado === 'finalizado';

                      return (
                        <div 
                          key={partido.id}
                          className={`bg-white rounded-2xl border-2 transition-all shadow-sm hover:shadow-md overflow-hidden ${
                            esEnCurso
                              ? 'border-green-500 bg-green-50/20 shadow-green-100'
                              : esSuspendido
                                ? 'border-yellow-400 bg-yellow-50/30'
                                : esFinalizado
                                  ? 'border-gray-200 bg-gray-50/60 opacity-90'
                                  : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          {/* Barra superior de información */}
                          <div className="bg-gray-50/90 px-4 py-2 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-blue-700 text-xs md:text-sm tracking-wide flex items-center gap-1">
                                ⏱️ {formatearHora(partido.hora)}
                              </span>
                              <span className="text-gray-300">|</span>
                              <span className="bg-blue-100 text-blue-800 text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full uppercase">
                                {partido.categoria}
                              </span>
                              <span className="text-gray-500 text-[10px] md:text-xs font-semibold">
                                {partido.fase_torneo}
                              </span>
                            </div>

                            {/* Badge de Estado */}
                            <div>
                              {esEnCurso && (
                                <span className="bg-green-600 text-white font-black text-[10px] uppercase px-3 py-0.5 rounded-full animate-pulse flex items-center gap-1 shadow-sm">
                                  🔴 EN VIVO
                                </span>
                              )}
                              {esSuspendido && (
                                <span className="bg-yellow-500 text-gray-900 font-black text-[10px] uppercase px-3 py-0.5 rounded-full shadow-sm">
                                  ⏸️ SUSPENDIDO
                                </span>
                              )}
                              {esFinalizado && (
                                <span className="bg-gray-200 text-gray-700 font-black text-[10px] uppercase px-3 py-0.5 rounded-full">
                                  FINALIZADO
                                </span>
                              )}
                              {partido.estado === 'programado' && (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full">
                                  PROGRAMADO
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Cuerpo del Partido: Equipos, Marcador y Botón */}
                          <div className="p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            
                            {/* Enfrentamiento de Equipos */}
                            <div className="flex items-center justify-between md:justify-start w-full md:w-2/3 gap-3 md:gap-6">
                              
                              {/* Equipo Local */}
                              <div className="flex items-center gap-3 w-[42%] md:w-auto flex-1 justify-end md:justify-start">
                                <div className="text-right md:text-left flex-1 min-w-0">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Local</span>
                                  <span className="font-black text-gray-900 text-sm md:text-lg uppercase leading-tight line-clamp-2">
                                    {partido.local?.nombre || 'Local'}
                                  </span>
                                </div>
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm shrink-0 overflow-hidden">
                                  {partido.local?.logo_url ? (
                                    <img src={partido.local.logo_url} alt={partido.local.nombre} className="w-full h-full object-contain p-1" />
                                  ) : (
                                    <span className="text-gray-400 font-black text-base">{partido.local?.nombre?.charAt(0) || 'L'}</span>
                                  )}
                                </div>
                              </div>

                              {/* Marcador / VS */}
                              <div className="flex flex-col items-center justify-center shrink-0 px-2 min-w-[70px]">
                                {esFinalizado || esEnCurso || esSuspendido ? (
                                  <div className="flex items-center gap-1.5 font-black text-lg md:text-2xl text-gray-900">
                                    <span className={partido.puntos_local > partido.puntos_visitante ? "text-blue-600" : ""}>
                                      {partido.puntos_local ?? 0}
                                    </span>
                                    <span className="text-gray-400 text-sm">-</span>
                                    <span className={partido.puntos_visitante > partido.puntos_local ? "text-blue-600" : ""}>
                                      {partido.puntos_visitante ?? 0}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-black text-xs md:text-sm text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                                    VS
                                  </span>
                                )}
                              </div>

                              {/* Equipo Visitante */}
                              <div className="flex items-center gap-3 w-[42%] md:w-auto flex-1">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm shrink-0 overflow-hidden">
                                  {partido.visitante?.logo_url ? (
                                    <img src={partido.visitante.logo_url} alt={partido.visitante.nombre} className="w-full h-full object-contain p-1" />
                                  ) : (
                                    <span className="text-gray-400 font-black text-base">{partido.visitante?.nombre?.charAt(0) || 'V'}</span>
                                  )}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Visita</span>
                                  <span className="font-black text-gray-900 text-sm md:text-lg uppercase leading-tight line-clamp-2">
                                    {partido.visitante?.nombre || 'Visitante'}
                                  </span>
                                </div>
                              </div>

                            </div>

                            {/* Botón de Acción a la Mesa */}
                            <div className="w-full md:w-auto shrink-0 flex justify-end">
                              <Link
                                href={`/mesa-tecnica/${partido.id}`}
                                className={`w-full md:w-auto px-6 py-3 rounded-xl font-black uppercase tracking-wider text-xs transition-all text-center shadow-md flex items-center justify-center gap-2 ${
                                  esEnCurso
                                    ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
                                    : esSuspendido
                                      ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
                                      : esFinalizado
                                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                        : 'bg-gray-900 hover:bg-blue-600 text-white'
                                }`}
                              >
                                {esEnCurso ? '▶️ Continuar Anotando' : esSuspendido ? '⏸️ Reanudar / Mesa' : esFinalizado ? 'Ver / Editar' : '🏀 Abrir Pizarra'}
                              </Link>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ))}

            </div>
          ))}
        </div>
      )}
    </main>
  );
}

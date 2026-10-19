'use client';

import { useState, useEffect, Fragment } from "react";
import { supabase } from "../supabase"; 
import { obtenerLimiteClasificados, obtenerNombreFaseClasificacion } from "@/lib/categorias"; 

export default function TablaPosiciones() {
  const categorias = ["U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);
  const [posiciones, setPosiciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados para el modal de historial y resultados del equipo
  const [equipoModal, setEquipoModal] = useState<any | null>(null);
  const [partidosEquipo, setPartidosEquipo] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [filtroCatHistorial, setFiltroCatHistorial] = useState<string>("Todas");

  useEffect(() => {
    const calcularPosiciones = async () => {
      setCargando(true);
      
      // 1. Obtener todos los equipos de la categoría activa
      const { data: equiposData } = await supabase.from('equipos').select('*');
      
      const equiposFiltrados = equiposData?.filter(eq => 
        eq.categorias && eq.categorias.includes(categoriaActiva)
      ) || [];

      // 2. Obtener todos los partidos finalizados de esta categoría
      const { data: partidos } = await supabase
        .from('partidos')
        .select('*')
        .eq('categoria', categoriaActiva)
        .eq('estado', 'finalizado');

      let stats: any = {};
      equiposFiltrados.forEach(eq => {
        stats[eq.id] = {
          id: eq.id,
          nombre: eq.nombre,
          logo_url: eq.logo_url,
          pj: 0, 
          jg: 0, 
          jp: 0, 
          pf: 0, 
          pc: 0, 
          pts: 0 
        };
      });

      // 3. Procesar resultados usando directamente puntos_local y puntos_visitante de la tabla partidos
      if (partidos) {
        partidos.forEach(partido => {
          const localId = partido.equipo_local_id;
          const visitanteId = partido.equipo_visitante_id;

          const ptsLocal = partido.puntos_local || 0;
          const ptsVisitante = partido.puntos_visitante || 0;

          const local = stats[localId];
          const visitante = stats[visitanteId];

          if (local && visitante) {
            local.pj += 1;
            visitante.pj += 1;
            local.pf += ptsLocal;
            local.pc += ptsVisitante;
            visitante.pf += ptsVisitante;
            visitante.pc += ptsLocal;

            const tipo = partido.tipo_cierre || 'normal';

            if (tipo === 'forfeit_local') {
              // Local pierde por incomparecencia: 0 puntos en la tabla
              visitante.jg += 1;
              visitante.pts += 2;
              local.jp += 1;
              local.pts += 0;
            } else if (tipo === 'forfeit_visitante') {
              // Visitante pierde por incomparecencia: 0 puntos en la tabla
              local.jg += 1;
              local.pts += 2;
              visitante.jp += 1;
              visitante.pts += 0;
            } else if (tipo === 'doble_forfeit') {
              // Ambos pierden por incomparecencia: 0 puntos a ambos
              local.jp += 1;
              local.pts += 0;
              visitante.jp += 1;
              visitante.pts += 0;
            } else if (tipo === 'mesa_local') {
              // Local sancionado en mesa: 0 puntos
              visitante.jg += 1;
              visitante.pts += 2;
              local.jp += 1;
              local.pts += 0;
            } else if (tipo === 'mesa_visitante') {
              // Visitante sancionado en mesa: 0 puntos
              local.jg += 1;
              local.pts += 2;
              visitante.jp += 1;
              visitante.pts += 0;
            } else if (tipo === 'default_local') {
              // Inferioridad numérica FIBA: Perdedor recibe 1 punto
              visitante.jg += 1;
              visitante.pts += 2;
              local.jp += 1;
              local.pts += 1;
            } else if (tipo === 'default_visitante') {
              // Inferioridad numérica FIBA: Perdedor recibe 1 punto
              local.jg += 1;
              local.pts += 2;
              visitante.jp += 1;
              visitante.pts += 1;
            } else {
              // Caso normal en cancha
              if (ptsLocal > ptsVisitante) {
                local.jg += 1;
                local.pts += 2; // 2 puntos por victoria
                visitante.jp += 1;
                visitante.pts += 1; // 1 punto por derrota
              } else if (ptsVisitante > ptsLocal) {
                visitante.jg += 1;
                visitante.pts += 2;
                local.jp += 1;
                local.pts += 1;
              } else {
                // En caso de empate (si aplica en alguna categoría formativa)
                local.pts += 1;
                visitante.pts += 1;
              }
            }
          }
        });
      }

      // 4. Ordenar la tabla: Primero por Puntos (PTS), luego por Diferencia de Puntos (DIF) y Puntos a Favor (PF)
      const tabla = Object.values(stats)
        .sort((a: any, b: any) => {
          if (b.pts !== a.pts) return b.pts - a.pts; 
          const difA = a.pf - a.pc;
          const difB = b.pf - b.pc;
          if (difB !== difA) return difB - difA;
          return b.pf - a.pf;
        });

      setPosiciones(tabla);
      setCargando(false);
    };

    calcularPosiciones();
  }, [categoriaActiva]);

  const abrirHistorialEquipo = async (equipo: any) => {
    setEquipoModal(equipo);
    setCargandoHistorial(true);
    setFiltroCatHistorial(categoriaActiva); // Iniciar por defecto en la categoría que se está visualizando

    try {
      const { data, error } = await supabase
        .from('partidos')
        .select(`
          *,
          local:equipos!equipo_local_id(nombre, logo_url),
          visitante:equipos!equipo_visitante_id(nombre, logo_url)
        `)
        .or(`equipo_local_id.eq.${equipo.id},equipo_visitante_id.eq.${equipo.id}`)
        .eq('estado', 'finalizado')
        .order('fecha', { ascending: false });

      if (error) {
        console.error("Error al obtener partidos del equipo:", error);
      } else {
        setPartidosEquipo(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return "Fecha por definir";
    const [year, month, day] = fechaStr.split('-');
    if (!year || !month || !day) return fechaStr;
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const nombreMes = meses[parseInt(month, 10) - 1];
    return `${day} ${nombreMes} ${year}`;
  };

  return (
    <main className="container mx-auto py-8 md:py-12 px-4 max-w-5xl">
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">Tabla de Posiciones</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1 font-medium">Clasificación General Oficial - Libalnna</p>
      </div>

      {/* Selector de Categorías (Pestañas) */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-5 py-2 md:px-6 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
              categoriaActiva === cat
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      {/* Fin Selector de Categorías */}

      {/* Banner de Información de Clasificación a Playoffs */}
      {(() => {
        const limiteClasificados = obtenerLimiteClasificados(categoriaActiva);
        const nombreFase = obtenerNombreFaseClasificacion(categoriaActiva);

        return (
          <>
            {limiteClasificados > 0 ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 px-4 py-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-3 w-3 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs md:text-sm font-extrabold text-emerald-950">
                    Zona de Clasificación: <span className="text-emerald-700 underline decoration-emerald-400 decoration-2">Top {limiteClasificados} equipos avanzan a {nombreFase}</span>
                  </span>
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-3 py-1 rounded-full shadow-xs shrink-0">
                  ⭐ {limiteClasificados} Clasificados ({categoriaActiva})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 mb-4 px-4 py-2.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-blue-900 text-xs md:text-sm font-semibold">
                <span className="text-base">🏀</span>
                <span>Categoría {categoriaActiva} (Formativa / Recreativa - Todos los equipos participan sin corte clasificatorio).</span>
              </div>
            )}

            {/* Diseño de la Tabla de Posiciones */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-[11px] md:text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="px-3 py-4 font-bold text-center">Pos</th>
                      <th className="px-3 py-4 font-bold">Equipo</th>
                      <th className="px-3 py-4 font-bold text-center">PJ</th>
                      <th className="px-3 py-4 font-bold text-center">JG</th>
                      <th className="px-3 py-4 font-bold text-center">JP</th>
                      <th className="px-3 py-4 font-bold text-center">PF</th>
                      <th className="px-3 py-4 font-bold text-center">PC</th>
                      <th className="px-3 py-4 font-bold text-center">DIF</th>
                      <th className="px-3 py-4 font-bold text-center text-blue-600">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cargando ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-gray-500 font-bold text-sm">Calculando posiciones...</td>
                      </tr>
                    ) : posiciones.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-gray-500 font-bold text-sm">No hay equipos registrados o partidos finalizados en esta categoría.</td>
                      </tr>
                    ) : (
                      posiciones.map((equipo, index) => {
                        const pos = index + 1;
                        const esClasificado = limiteClasificados > 0 && pos <= limiteClasificados;
                        const esUltimoClasificado = limiteClasificados > 0 && pos === limiteClasificados && pos < posiciones.length;

                        return (
                          <Fragment key={equipo.id}>
                            <tr 
                              onClick={() => abrirHistorialEquipo(equipo)}
                              className={`transition-all cursor-pointer group select-none ${
                                esClasificado 
                                  ? 'bg-emerald-50/25 hover:bg-emerald-100/40' 
                                  : 'hover:bg-blue-50/70'
                              }`}
                              title="Haz clic para ver el resumen de partidos de este equipo"
                            >
                              <td className={`px-3 py-4 font-black text-center relative ${
                                esClasificado ? 'border-l-4 border-emerald-500' : 'border-l-4 border-transparent'
                              }`}>
                                <div className="flex items-center justify-center">
                                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                                    pos === 1 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                                    pos === 2 ? 'bg-slate-300 text-slate-900 shadow-xs' :
                                    pos === 3 ? 'bg-amber-700 text-white shadow-xs' :
                                    esClasificado ? 'bg-emerald-100 text-emerald-800 font-black' :
                                    'text-gray-700'
                                  }`}>
                                    {pos}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-4 flex items-center justify-between font-bold text-sm md:text-base text-gray-900 uppercase whitespace-nowrap">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <div className="w-7 h-7 md:w-8 md:h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 border border-gray-200 group-hover:scale-110 transition-transform">
                                    {equipo.logo_url ? (
                                      <img src={equipo.logo_url} alt={equipo.nombre} className="w-full h-full object-contain p-0.5 rounded-full" />
                                    ) : (
                                      <span className="text-gray-400 text-[10px] md:text-xs">{equipo.nombre.charAt(0)}</span>
                                    )}
                                  </div>
                                  <span className="truncate max-w-[150px] md:max-w-none group-hover:text-blue-600 transition-colors">
                                    {equipo.nombre}
                                  </span>
                                  {esClasificado && (
                                    <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300/80 shrink-0">
                                      ⭐ Clasificado
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold ml-2 hidden sm:inline">
                                  Ver partidos ➔
                                </span>
                              </td>
                              <td className="px-3 py-4 text-center font-semibold text-gray-600 text-sm md:text-base">{equipo.pj}</td>
                              <td className="px-3 py-4 text-center font-bold text-green-600 text-sm md:text-base">{equipo.jg}</td>
                              <td className="px-3 py-4 text-center font-bold text-red-500 text-sm md:text-base">{equipo.jp}</td>
                              <td className="px-3 py-4 text-center font-semibold text-gray-600 text-sm md:text-base">{equipo.pf}</td>
                              <td className="px-3 py-4 text-center font-semibold text-gray-600 text-sm md:text-base">{equipo.pc}</td>
                              <td className="px-3 py-4 text-center font-bold text-gray-800 text-sm md:text-base">
                                {(equipo.pf - equipo.pc) > 0 ? `+${equipo.pf - equipo.pc}` : equipo.pf - equipo.pc}
                              </td>
                              <td className="px-3 py-4 text-center font-black text-blue-600 text-base md:text-lg">{equipo.pts}</td>
                            </tr>

                            {/* LÍNEA DIVISORIA DE CLASIFICACIÓN A PLAYOFFS */}
                            {esUltimoClasificado && (
                              <tr key={`separador-playoffs-${pos}`} className="bg-gradient-to-r from-emerald-100/70 via-emerald-200/90 to-emerald-100/70 border-y-2 border-dashed border-emerald-400 select-none">
                                <td colSpan={9} className="py-2.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-3 text-emerald-950 font-black text-[11px] md:text-xs uppercase tracking-wider">
                                    <div className="hidden sm:block flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>
                                    <span className="flex items-center gap-1.5 bg-white px-3.5 py-1 rounded-full border border-emerald-300 shadow-xs">
                                      <span className="text-emerald-500">⭐</span>
                                      <span>LÍMITE DE CLASIFICACIÓN ({limiteClasificados} CLASIFICADOS A {nombreFase.toUpperCase()})</span>
                                      <span className="text-emerald-500">⭐</span>
                                    </span>
                                    <div className="hidden sm:block flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pie de tabla con leyenda explicativa */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  {limiteClasificados > 0 && (
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Puestos 1 al {limiteClasificados}: Zona de Clasificación a {nombreFase}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <span>💡 Haz clic en cualquier equipo para ver el resumen de sus partidos.</span>
                  </div>
                </div>
                <div className="font-semibold text-gray-400">
                  Libalnna Oficial
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* 🏀 MODAL RESUMEN DE PARTIDOS DEL EQUIPO */}
      {equipoModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border-2 border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Cabecera del modal */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-blue-950 p-5 md:p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center p-1 border-2 border-blue-400 shadow-lg shrink-0 overflow-hidden">
                  {equipoModal.logo_url ? (
                    <img src={equipoModal.logo_url} alt={equipoModal.nombre} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-gray-900 font-black text-2xl">{equipoModal.nombre?.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] md:text-xs font-bold text-blue-400 uppercase tracking-widest block">Resumen del Club</span>
                  <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight">{equipoModal.nombre}</h2>
                </div>
              </div>
              <button 
                onClick={() => setEquipoModal(null)} 
                className="w-9 h-9 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center font-black text-white text-base transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              
              {/* Tarjetas resumen de métricas */}
              {(() => {
                const partidosFiltrados = filtroCatHistorial === "Todas"
                  ? partidosEquipo
                  : partidosEquipo.filter(p => p.categoria === filtroCatHistorial);

                let vic = 0;
                let der = 0;
                let emp = 0;
                let pf = 0;
                let pc = 0;

                partidosFiltrados.forEach(p => {
                  const isLocal = p.equipo_local_id === equipoModal.id;
                  const ptsF = isLocal ? (p.puntos_local || 0) : (p.puntos_visitante || 0);
                  const ptsC = isLocal ? (p.puntos_visitante || 0) : (p.puntos_local || 0);
                  pf += ptsF;
                  pc += ptsC;

                  const tipo = p.tipo_cierre || 'normal';
                  if (tipo === 'forfeit_local') {
                    if (isLocal) der++; else vic++;
                  } else if (tipo === 'forfeit_visitante') {
                    if (isLocal) vic++; else der++;
                  } else if (tipo === 'doble_forfeit') {
                    der++;
                  } else if (tipo === 'mesa_local') {
                    if (isLocal) der++; else vic++;
                  } else if (tipo === 'mesa_visitante') {
                    if (isLocal) vic++; else der++;
                  } else {
                    if (ptsF > ptsC) vic++;
                    else if (ptsC > ptsF) der++;
                    else emp++;
                  }
                });

                const dif = pf - pc;
                const totalJuegos = partidosFiltrados.length;
                const winRate = totalJuegos > 0 ? Math.round((vic / totalJuegos) * 100) : 0;

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Partidos</span>
                        <span className="text-xl md:text-2xl font-black text-gray-900">{totalJuegos}</span>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider block">Victorias</span>
                        <span className="text-xl md:text-2xl font-black text-green-700">{vic}</span>
                        <span className="text-[9px] font-bold text-green-600 block mt-0.5">({winRate}%)</span>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Derrotas</span>
                        <span className="text-xl md:text-2xl font-black text-red-700">{der}</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Diferencia</span>
                        <span className={`text-xl md:text-2xl font-black ${dif >= 0 ? 'text-blue-700' : 'text-gray-800'}`}>
                          {dif > 0 ? `+${dif}` : dif}
                        </span>
                        <span className="text-[9px] font-bold text-gray-500 block mt-0.5">{pf} PF / {pc} PC</span>
                      </div>
                    </div>

                    {/* Filtro por Categoría en el modal */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-700 uppercase">Filtrar por Categoría:</span>
                        <span className="text-[11px] font-bold text-gray-500">
                          {partidosFiltrados.length} {partidosFiltrados.length === 1 ? 'partido' : 'partidos'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {["Todas", ...Array.from(new Set(partidosEquipo.map(p => p.categoria))).filter(Boolean)].map((cat: any) => (
                          <button
                            key={cat}
                            onClick={() => setFiltroCatHistorial(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              filtroCatHistorial === cat
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Listado de partidos */}
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-bold text-gray-700 uppercase">Historial de Resultados:</span>
                      
                      {cargandoHistorial ? (
                        <div className="text-center py-10 font-bold text-gray-500 animate-pulse text-sm">
                          Cargando historial de juegos...
                        </div>
                      ) : partidosFiltrados.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500">
                          <span className="text-3xl block mb-2">🏀</span>
                          <p className="font-bold text-sm text-gray-700">Sin partidos finalizados</p>
                          <p className="text-xs text-gray-500 mt-1">Este club no tiene partidos registrados en la categoría seleccionada.</p>
                        </div>
                      ) : (
                        partidosFiltrados.map((p) => {
                          const isLocal = p.equipo_local_id === equipoModal.id;
                          const ptsLocal = p.puntos_local ?? 0;
                          const ptsVis = p.puntos_visitante ?? 0;
                          const ptsF = isLocal ? ptsLocal : ptsVis;
                          const ptsC = isLocal ? ptsVis : ptsLocal;
                          const tipo = p.tipo_cierre || 'normal';

                          let gano = false;
                          let perdio = false;
                          let empate = false;
                          let etiquetaEspecial = null;

                          if (tipo === 'forfeit_local') {
                            if (isLocal) { perdio = true; etiquetaEspecial = 'W.O. / FORFEIT'; }
                            else { gano = true; etiquetaEspecial = 'VICTORIA POR W.O.'; }
                          } else if (tipo === 'forfeit_visitante') {
                            if (isLocal) { gano = true; etiquetaEspecial = 'VICTORIA POR W.O.'; }
                            else { perdio = true; etiquetaEspecial = 'W.O. / FORFEIT'; }
                          } else if (tipo === 'doble_forfeit') {
                            perdio = true;
                            etiquetaEspecial = 'DOBLE FORFEIT';
                          } else if (tipo === 'mesa_local') {
                            if (isLocal) { perdio = true; etiquetaEspecial = 'SANCIONADO EN MESA ⚖️'; }
                            else { gano = true; etiquetaEspecial = 'VICTORIA EN MESA ⚖️'; }
                          } else if (tipo === 'mesa_visitante') {
                            if (isLocal) { gano = true; etiquetaEspecial = 'VICTORIA EN MESA ⚖️'; }
                            else { perdio = true; etiquetaEspecial = 'SANCIONADO EN MESA ⚖️'; }
                          } else if (tipo === 'default_local' || tipo === 'default_visitante') {
                            if (ptsF > ptsC) gano = true; else perdio = true;
                            etiquetaEspecial = 'DEFAULT';
                          } else {
                            if (ptsF > ptsC) gano = true;
                            else if (ptsC > ptsF) perdio = true;
                            else empate = true;
                          }

                          return (
                            <div 
                              key={p.id} 
                              className={`border rounded-2xl p-3.5 md:p-4 transition-all shadow-sm ${
                                gano 
                                  ? 'bg-gradient-to-r from-green-50/50 to-white border-green-200' 
                                  : perdio 
                                  ? 'bg-gradient-to-r from-red-50/40 to-white border-red-200' 
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              {/* Barra superior de la tarjeta */}
                              <div className="flex justify-between items-center text-[11px] mb-2.5 pb-2 border-b border-gray-100">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded text-[10px]">
                                    {p.categoria}
                                  </span>
                                  <span className="text-gray-500 font-semibold">
                                    📅 {formatearFecha(p.fecha)}
                                  </span>
                                  {p.lugar && (
                                    <span className="text-gray-400 hidden sm:inline">
                                      • 📍 {p.lugar}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {etiquetaEspecial ? (
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                      gano ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
                                    }`}>
                                      {etiquetaEspecial}
                                    </span>
                                  ) : gano ? (
                                    <span className="bg-green-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      VICTORIA
                                    </span>
                                  ) : perdio ? (
                                    <span className="bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      DERROTA
                                    </span>
                                  ) : (
                                    <span className="bg-gray-200 text-gray-700 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      EMPATE
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Enfrentamiento y Marcador */}
                              <div className="grid grid-cols-7 items-center gap-2">
                                
                                {/* Equipo Local */}
                                <div className={`col-span-3 flex items-center gap-2 ${p.equipo_local_id === equipoModal.id ? 'font-black text-gray-900' : 'font-medium text-gray-600'}`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center p-0.5 border shrink-0 bg-white shadow-sm ${p.equipo_local_id === equipoModal.id ? 'ring-2 ring-blue-500' : 'border-gray-200'}`}>
                                    {p.local?.logo_url ? (
                                      <img src={p.local.logo_url} alt={p.local?.nombre} className="w-full h-full object-contain" />
                                    ) : (
                                      <span className="text-gray-400 text-xs font-black">{p.local?.nombre?.charAt(0)}</span>
                                    )}
                                  </div>
                                  <span className="text-xs md:text-sm uppercase truncate">
                                    {p.local?.nombre}
                                  </span>
                                </div>

                                {/* Marcador */}
                                <div className="col-span-1 flex items-center justify-center gap-1 text-center font-black">
                                  <span className={`text-base md:text-xl ${ptsLocal > ptsVis ? 'text-green-600 font-black' : ptsLocal < ptsVis ? 'text-gray-400 font-bold' : 'text-gray-700'}`}>
                                    {ptsLocal}
                                  </span>
                                  <span className="text-gray-300 text-xs">-</span>
                                  <span className={`text-base md:text-xl ${ptsVis > ptsLocal ? 'text-green-600 font-black' : ptsVis < ptsLocal ? 'text-gray-400 font-bold' : 'text-gray-700'}`}>
                                    {ptsVis}
                                  </span>
                                </div>

                                {/* Equipo Visitante */}
                                <div className={`col-span-3 flex items-center justify-end gap-2 text-right ${p.equipo_visitante_id === equipoModal.id ? 'font-black text-gray-900' : 'font-medium text-gray-600'}`}>
                                  <span className="text-xs md:text-sm uppercase truncate">
                                    {p.visitante?.nombre}
                                  </span>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center p-0.5 border shrink-0 bg-white shadow-sm ${p.equipo_visitante_id === equipoModal.id ? 'ring-2 ring-blue-500' : 'border-gray-200'}`}>
                                    {p.visitante?.logo_url ? (
                                      <img src={p.visitante.logo_url} alt={p.visitante?.nombre} className="w-full h-full object-contain" />
                                    ) : (
                                      <span className="text-gray-400 text-xs font-black">{p.visitante?.nombre?.charAt(0)}</span>
                                    )}
                                  </div>
                                </div>

                              </div>

                              {/* Si hubo motivo de sanción */}
                              {p.motivo_sancion && (
                                <div className="mt-2 text-[10px] bg-purple-50 text-purple-900 border border-purple-200 p-1.5 rounded-lg font-medium flex items-center gap-1">
                                  <span>⚖️ Acta:</span>
                                  <span className="truncate">{p.motivo_sancion}</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}

            </div>

            {/* Pie del modal */}
            <div className="bg-gray-50 border-t border-gray-100 p-3 text-center shrink-0">
              <button 
                onClick={() => setEquipoModal(null)} 
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-black py-2.5 px-8 rounded-xl uppercase transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
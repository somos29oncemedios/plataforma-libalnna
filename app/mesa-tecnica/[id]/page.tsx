'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../supabase';

export default function MesaTecnicaPartido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [partido, setPartido] = useState<any>(null);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [editandoDespuesDeFinalizar, setEditandoDespuesDeFinalizar] = useState(false);

  // 🏀 ROSTERS COMPLETOS DEL PARTIDO (Filtrados por categoría)
  const [rosterLocalCompleto, setRosterLocalCompleto] = useState<any[]>([]);
  const [rosterVisitanteCompleto, setRosterVisitanteCompleto] = useState<any[]>([]);

  // 🏀 FASE 0: SELECCIÓN DEL QUINTETO INICIAL
  const [seleccionInicial, setSeleccionInicial] = useState(true);
  const [selLocal, setSelLocal] = useState<any[]>([]);
  const [selVisitante, setSelVisitante] = useState<any[]>([]);

  // 🏀 ESTADOS PARA DIVIDIR CANCHA Y BANCA (Durante el juego)
  const [canchaLocal, setCanchaLocal] = useState<any[]>([]);
  const [bancaLocal, setBancaLocal] = useState<any[]>([]);
  const [canchaVisitante, setCanchaVisitante] = useState<any[]>([]);
  const [bancaVisitante, setBancaVisitante] = useState<any[]>([]);

  // 🏀 ESTADO PARA MODAL DE BANCA
  const [modalBanca, setModalBanca] = useState<'local' | 'visitante' | null>(null);

  // 🏀 ESTADOS PARA LA MEMORIA MUSCULAR (Acción y Operación: sumar o restar)
  const [accionPendiente, setAccionPendiente] = useState<'tl' | 'd2' | 't3' | null>(null);
  const [modoOperacion, setModoOperacion] = useState<'sumar' | 'restar'>('sumar');

  const cargarPartido = async () => {
    const { data: partidoData } = await supabase
      .from('partidos')
      .select('*, local:equipos!equipo_local_id(nombre, logo_url), visitante:equipos!equipo_visitante_id(nombre, logo_url)')
      .eq('id', id)
      .single();

    if (partidoData) {
      setPartido(partidoData);

      // Traemos a TODOS los jugadores de ambos equipos primero
      const { data: jugadoresData } = await supabase
        .from('jugadores')
        .select('*')
        .in('equipo_id', [partidoData.equipo_local_id, partidoData.equipo_visitante_id])
        .order('numero', { ascending: true });

      if (jugadoresData) {
        // Filtramos verificando el arreglo de categorías del jugador
        const jugadoresFiltrados = jugadoresData.filter((j: any) => {
          if (!partidoData.categoria) return true; 
          
          if (Array.isArray(j.categorias)) {
            return j.categorias.includes(partidoData.categoria);
          }
          return j.categoria === partidoData.categoria;
        });

        const localTeam = jugadoresFiltrados.filter((j: any) => j.equipo_id === partidoData.equipo_local_id);
        const visitorTeam = jugadoresFiltrados.filter((j: any) => j.equipo_id === partidoData.equipo_visitante_id);

        setRosterLocalCompleto(localTeam);
        setRosterVisitanteCompleto(visitorTeam);
      }

      const { data: statsData } = await supabase
        .from('box_scores')
        .select('*')
        .eq('partido_id', id);

      let statsMap: any = {};
      if (statsData) {
        statsData.forEach((stat: any) => {
          statsMap[stat.jugador_id] = stat;
        });
      }
      setEstadisticas(statsMap);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarPartido();
  }, [id]);

  // 🏀 FASE 0: FUNCIONES PARA SELECCIONAR A LOS 5 INICIALES
  const toggleSelLocal = (jugador: any) => {
    if (selLocal.find(s => s.id === jugador.id)) {
      setSelLocal(selLocal.filter(s => s.id !== jugador.id));
    } else if (selLocal.length < 5) {
      setSelLocal([...selLocal, jugador]);
    }
  };

  const toggleSelVisitante = (jugador: any) => {
    if (selVisitante.find(s => s.id === jugador.id)) {
      setSelVisitante(selVisitante.filter(s => s.id !== jugador.id));
    } else if (selVisitante.length < 5) {
      setSelVisitante([...selVisitante, jugador]);
    }
  };

  const confirmarQuintetos = async () => {
    setCanchaLocal(selLocal);
    setBancaLocal(rosterLocalCompleto.filter(j => !selLocal.find(s => s.id === j.id)));
    
    setCanchaVisitante(selVisitante);
    setBancaVisitante(rosterVisitanteCompleto.filter(j => !selVisitante.find(s => s.id === j.id)));
    
    setSeleccionInicial(false);

    // Si el partido estaba programado, lo pasamos a "en curso" automáticamente
    if (partido?.estado === 'programado') {
      await supabase.from('partidos').update({ estado: 'en curso' }).eq('id', id);
      setPartido({ ...partido, estado: 'en curso' });
    }
  };

  // 🏀 NUEVA FUNCIÓN: REVERTIR ESTADO A "PROGRAMADO"
  const revertirAProgramado = async () => {
    const confirmar = window.confirm("⚠️ ¿Estás seguro de que deseas devolver este partido a 'Programado'? Esto quitará el partido de la vista 'En Vivo' del público.");
    if (!confirmar) return;

    const { error } = await supabase.from('partidos').update({ estado: 'programado' }).eq('id', id);
    if (!error) {
      alert('✅ Partido devuelto a estado Programado correctamente.');
      setPartido({ ...partido, estado: 'programado' });
    } else {
      alert(`❌ Error técnico: ${error.message}`);
    }
  };

  // ----- LÓGICA DE JUEGO PRINCIPAL -----

  const partidoBloqueado = partido?.estado === 'finalizado' && !editandoDespuesDeFinalizar;

  const anotarEstadistica = async (jugadorId: string, equipoId: string, tipo: 'tl' | 'd2' | 't3', operacion: 'sumar' | 'restar') => {
    if (partidoBloqueado) {
      alert('El partido ya ha finalizado. Habilita la edición si necesitas hacer correcciones.');
      return;
    }

    const statsActuales = estadisticas[jugadorId] || {
      partido_id: id,
      jugador_id: jugadorId,
      equipo_id: equipoId,
      puntos_totales: 0,
      tiros_libres_anotados: 0,
      triples_anotados: 0
    };

    let nuevosPuntos = statsActuales.puntos_totales || 0;
    let nuevosTL = statsActuales.tiros_libres_anotados || 0;
    let nuevosTriples = statsActuales.triples_anotados || 0;

    if (tipo === 'tl') {
      if (operacion === 'sumar') { nuevosPuntos += 1; nuevosTL += 1; } 
      else { nuevosPuntos = Math.max(0, nuevosPuntos - 1); nuevosTL = Math.max(0, nuevosTL - 1); }
    } else if (tipo === 'd2') {
      if (operacion === 'sumar') { nuevosPuntos += 2; } 
      else { nuevosPuntos = Math.max(0, nuevosPuntos - 2); }
    } else if (tipo === 't3') {
      if (operacion === 'sumar') { nuevosPuntos += 3; nuevosTriples += 1; } 
      else { nuevosPuntos = Math.max(0, nuevosPuntos - 3); nuevosTriples = Math.max(0, nuevosTriples - 1); }
    }

    const datosActualizados = {
      puntos_totales: nuevosPuntos,
      tiros_libres_anotados: nuevosTL,
      triples_anotados: nuevosTriples
    };

    let error = null;
    let registroExistente = estadisticas[jugadorId];

    if (registroExistente && registroExistente.id) {
      const res = await supabase.from('box_scores').update(datosActualizados).eq('id', registroExistente.id);
      error = res.error;
    } else {
      const { data: existingRow } = await supabase.from('box_scores').select('id').eq('partido_id', id).eq('jugador_id', jugadorId).maybeSingle();
      if (existingRow && existingRow.id) {
        const res = await supabase.from('box_scores').update(datosActualizados).eq('id', existingRow.id);
        error = res.error;
        registroExistente = { ...existingRow };
      } else {
        const res = await supabase.from('box_scores').insert([{ partido_id: id, jugador_id: jugadorId, equipo_id: equipoId, ...datosActualizados }]).select().single();
        error = res.error;
        if (!error && res.data) {
          const nuevasEstatsMap = { ...estadisticas, [jugadorId]: res.data };
          setEstadisticas(nuevasEstatsMap);
          sincronizarPuntosGlobales(nuevasEstatsMap, partido?.score_manual_local || 0, partido?.score_manual_visitante || 0);
          return;
        }
      }
    }

    if (!error) {
      const nuevasEstatsMap = {
        ...estadisticas,
        [jugadorId]: { ...(estadisticas[jugadorId] || { partido_id: id, jugador_id: jugadorId, equipo_id: equipoId }), ...datosActualizados, id: registroExistente?.id || estadisticas[jugadorId]?.id }
      };
      setEstadisticas(nuevasEstatsMap);
      sincronizarPuntosGlobales(nuevasEstatsMap, partido?.score_manual_local || 0, partido?.score_manual_visitante || 0);
    } else {
      alert(`❌ Error técnico de Supabase: ${error.message}`);
    }
  };

  const ajustarScoreManual = async (equipo: 'local' | 'visitante', operacion: 'sumar' | 'restar') => {
    if (partidoBloqueado) return;
    const campo = equipo === 'local' ? 'score_manual_local' : 'score_manual_visitante';
    let valorActual = partido[campo] || 0;
    
    // 🔥 AJUSTE: Quitamos el Math.max para permitir que el offset manual sea negativo
    // Esto es crucial para poder restar del total global cuando sea necesario
    let nuevoValor = operacion === 'sumar' ? valorActual + 1 : valorActual - 1;
    
    const manualLocal = equipo === 'local' ? nuevoValor : (partido?.score_manual_local || 0);
    const manualVis = equipo === 'visitante' ? nuevoValor : (partido?.score_manual_visitante || 0);

    let sLocal = 0; let sVis = 0;
    Object.values(estadisticas).forEach((stat: any) => {
      if (stat.equipo_id === partido?.equipo_local_id) sLocal += (stat.puntos_totales || 0);
      if (stat.equipo_id === partido?.equipo_visitante_id) sVis += (stat.puntos_totales || 0);
    });

    const finalSLocal = Math.max(0, sLocal + manualLocal);
    const finalSVis = Math.max(0, sVis + manualVis);

    const { error } = await supabase.from('partidos').update({ [campo]: nuevoValor, puntos_local: finalSLocal, puntos_visitante: finalSVis }).eq('id', id);
    if (!error) setPartido({ ...partido, [campo]: nuevoValor, puntos_local: finalSLocal, puntos_visitante: finalSVis });
  };

  const sincronizarPuntosGlobales = async (currentStats: any, manualLocal: number, manualVis: number) => {
    let sLocal = 0; let sVis = 0;
    Object.values(currentStats).forEach((stat: any) => {
      if (stat.equipo_id === partido?.equipo_local_id) sLocal += (stat.puntos_totales || 0);
      if (stat.equipo_id === partido?.equipo_visitante_id) sVis += (stat.puntos_totales || 0);
    });
    const finalSLocal = Math.max(0, sLocal + manualLocal);
    const finalSVis = Math.max(0, sVis + manualVis);
    await supabase.from('partidos').update({ puntos_local: finalSLocal, puntos_visitante: finalSVis }).eq('id', id);
  };

  const cambiarPeriodo = async (nuevoPeriodo: string) => {
    if (partidoBloqueado) return;
    const { error } = await supabase.from('partidos').update({ periodo_actual: nuevoPeriodo }).eq('id', id);
    if (!error) {
      setPartido({ ...partido, periodo_actual: nuevoPeriodo });
    }
  };

  const finalizarPartido = async () => {
    const confirmar = window.confirm("🛑 ¿Estás seguro de guardar el marcador definitivo y cerrar el panel del partido?");
    if (!confirmar) return;
    await sincronizarPuntosGlobales(estadisticas, partido?.score_manual_local || 0, partido?.score_manual_visitante || 0);
    const { error } = await supabase.from('partidos').update({ estado: 'finalizado' }).eq('id', id);
    if (!error) {
      alert('✅ ¡Partido finalizado y marcador guardado con éxito!');
      setPartido({ ...partido, estado: 'finalizado' });
      setEditandoDespuesDeFinalizar(false);
    }
  };

  const sustituirJugador = (jugador: any, equipo: 'local' | 'visitante', accion: 'entrar' | 'salir') => {
    if (equipo === 'local') {
      if (accion === 'entrar') {
        if (canchaLocal.length >= 5) {
          alert("¡Falta técnica! Ya hay 5 jugadores en la cancha. Saca a uno primero.");
          return;
        }
        setBancaLocal(bancaLocal.filter(j => j.id !== jugador.id));
        setCanchaLocal([...canchaLocal, jugador]);
      } else {
        setCanchaLocal(canchaLocal.filter(j => j.id !== jugador.id));
        setBancaLocal([...bancaLocal, jugador].sort((a, b) => a.numero - b.numero));
      }
    } else {
      if (accion === 'entrar') {
        if (canchaVisitante.length >= 5) {
          alert("¡Falta técnica! Ya hay 5 jugadores en la cancha. Saca a uno primero.");
          return;
        }
        setBancaVisitante(bancaVisitante.filter(j => j.id !== jugador.id));
        setCanchaVisitante([...canchaVisitante, jugador]);
      } else {
        setCanchaVisitante(canchaVisitante.filter(j => j.id !== jugador.id));
        setBancaVisitante([...bancaVisitante, jugador].sort((a, b) => a.numero - b.numero));
      }
    }
  };

  const clickCamisetaJugador = (jugador: any, equipoId: string) => {
    if (!accionPendiente) {
      alert("⚠️ Primero toca la zona de la cancha desde donde se hizo el tiro.");
      return;
    }
    anotarEstadistica(jugador.id, equipoId, accionPendiente, modoOperacion);
    setAccionPendiente(null); 
  };

  let scoreJugadoresLocal = 0; let scoreJugadoresVisitante = 0;
  Object.values(estadisticas || {}).forEach((stat: any) => {
    if (stat.equipo_id === partido?.equipo_local_id) scoreJugadoresLocal += (stat.puntos_totales || 0);
    if (stat.equipo_id === partido?.equipo_visitante_id) scoreJugadoresVisitante += (stat.puntos_totales || 0);
  });
  const scoreLocal = Math.max(0, scoreJugadoresLocal + (partido?.score_manual_local || 0));
  const scoreVisitante = Math.max(0, scoreJugadoresVisitante + (partido?.score_manual_visitante || 0));

  if (cargando) return <div className="text-center py-20 font-bold text-gray-500">Preparando la Mesa Técnica...</div>;

  // 🏀 RENDER FASE 0: PANTALLA DE SELECCIÓN INICIAL
  if (seleccionInicial) {
    const isLocalReady = selLocal.length === Math.min(5, rosterLocalCompleto.length);
    const isVisitaReady = selVisitante.length === Math.min(5, rosterVisitanteCompleto.length);

    return (
      <main className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-2xl border-2 border-gray-100">
          <div className="text-center mb-8">
            <span className="bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-full tracking-widest uppercase">Paso Previo</span>
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tight mt-3">
              Quintetos Iniciales
            </h1>
            <p className="text-gray-500 font-bold mt-2 text-sm md:text-base">
              Selecciona a los 5 jugadores que entrarán a la duela por cada equipo.
            </p>
            <p className="text-blue-600 font-black mt-2 bg-blue-50 py-2 rounded-lg">
              Categoría Oficial: {partido?.categoria || "General"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LOCAL */}
            <div className="bg-blue-50/50 p-4 md:p-6 rounded-2xl border-2 border-blue-200 shadow-inner">
              <h2 className="text-lg md:text-xl font-black text-blue-900 mb-4 uppercase text-center border-b-2 border-blue-200 pb-2 flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-white rounded-full p-1 border shadow-sm flex items-center justify-center overflow-hidden">
                  {partido?.local?.logo_url ? <img src={partido.local.logo_url} alt="Local" className="w-full h-full object-contain" /> : <span className="text-gray-800 font-black">{partido?.local?.nombre?.charAt(0)}</span>}
                </div>
                <span>{partido?.local?.nombre} <span className="text-sm text-blue-600">({selLocal.length}/5)</span></span>
              </h2>
              {rosterLocalCompleto.length === 0 ? (
                <p className="text-center text-xs font-bold text-red-500 bg-white p-4 rounded-xl shadow-sm border border-red-200">
                  ¡Atención! Este equipo no tiene jugadores registrados en la categoría {partido?.categoria}.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {rosterLocalCompleto.map(j => {
                    const isSel = selLocal.find(s => s.id === j.id);
                    return (
                      <button key={j.id} onClick={() => toggleSelLocal(j)} className={`p-3 rounded-xl border-2 flex justify-between items-center transition-all ${isSel ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300'}`}>
                        <span className="font-bold text-sm">#{j.numero} - {j.nombre}</span>
                        {isSel ? <span className="text-lg">✅</span> : <span className="w-5 h-5 border-2 border-gray-300 rounded-md"></span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* VISITANTE */}
            <div className="bg-red-50/50 p-4 md:p-6 rounded-2xl border-2 border-red-200 shadow-inner">
              <h2 className="text-lg md:text-xl font-black text-red-900 mb-4 uppercase text-center border-b-2 border-red-200 pb-2 flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-white rounded-full p-1 border shadow-sm flex items-center justify-center overflow-hidden">
                  {partido?.visitante?.logo_url ? <img src={partido.visitante.logo_url} alt="Visita" className="w-full h-full object-contain" /> : <span className="text-gray-800 font-black">{partido?.visitante?.nombre?.charAt(0)}</span>}
                </div>
                <span>{partido?.visitante?.nombre} <span className="text-sm text-red-600">({selVisitante.length}/5)</span></span>
              </h2>
              {rosterVisitanteCompleto.length === 0 ? (
                <p className="text-center text-xs font-bold text-red-500 bg-white p-4 rounded-xl shadow-sm border border-red-200">
                  ¡Atención! Este equipo no tiene jugadores registrados en la categoría {partido?.categoria}.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {rosterVisitanteCompleto.map(j => {
                    const isSel = selVisitante.find(s => s.id === j.id);
                    return (
                      <button key={j.id} onClick={() => toggleSelVisitante(j)} className={`p-3 rounded-xl border-2 flex justify-between items-center transition-all ${isSel ? 'bg-red-600 text-white border-red-700 shadow-md' : 'bg-white text-gray-800 border-gray-200 hover:border-red-300'}`}>
                        <span className="font-bold text-sm">#{j.numero} - {j.nombre}</span>
                        {isSel ? <span className="text-lg">✅</span> : <span className="w-5 h-5 border-2 border-gray-300 rounded-md"></span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              disabled={(!isLocalReady && rosterLocalCompleto.length >= 5) || (!isVisitaReady && rosterVisitanteCompleto.length >= 5)}
              onClick={confirmarQuintetos}
              className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Confirmar e Ir a la Cancha 🏀
            </button>

            {/* BOTÓN PARA REVERTIR PARTIDO EN CURSO DESDE LA FASE 0 */}
            {partido?.estado === 'en curso' && (
              <button 
                onClick={revertirAProgramado} 
                className="text-red-500 hover:text-red-700 text-xs font-bold underline transition-colors"
              >
                ⏪ Cancelar y devolver partido a "Programado"
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // 🏀 RENDER FASE 1: MESA TÉCNICA PRINCIPAL (Cancha)

  const JugadorCancha = ({ jugador, equipo, tipoEquipo }: { jugador: any, equipo: string, tipoEquipo: 'local'|'visitante' }) => {
    const stats = estadisticas?.[jugador.id] || { puntos_totales: 0, tiros_libres_anotados: 0, triples_anotados: 0 };
    return (
      <div className={`flex flex-col items-center bg-white p-1 lg:p-1.5 rounded-lg border-2 shadow-sm relative w-[18%] lg:w-[46%] lg:max-w-[130px] transition-all ${accionPendiente ? (modoOperacion === 'sumar' ? 'border-yellow-400 scale-105 shadow-yellow-200' : 'border-red-500 scale-105 shadow-red-200 animate-pulse') : 'border-gray-200'}`}>
        <button 
          onClick={() => clickCamisetaJugador(jugador, equipo)}
          className={`w-7 h-7 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-black text-xs md:text-sm lg:text-base shadow-md transition-transform hover:scale-110 mb-0.5 ${tipoEquipo === 'local' ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-red-600 text-white hover:bg-red-500'} ${accionPendiente ? (modoOperacion === 'sumar' ? 'ring-2 ring-yellow-400' : 'ring-2 ring-red-500 bg-red-700') : ''}`}
        >
          {jugador.numero}
        </button>
        <span className="text-[6px] md:text-[7px] lg:text-[9px] font-black uppercase text-gray-800 text-center leading-tight truncate w-full mb-0.5 lg:mb-1">{jugador.nombre}</span>
        
        <div className="w-full bg-gray-50 border border-gray-100 rounded flex flex-col p-0.5 lg:p-1 text-[5px] md:text-[6.5px] lg:text-[8px] gap-0.1 lg:gap-0.5">
          <div className="flex justify-between items-center font-black text-blue-700 border-b border-gray-200 pb-0.1 lg:pb-0.5 mb-0.1 lg:mb-0.5">
            <span>PTS</span> <span className="text-[7px] md:text-[10px] lg:text-[13px]">{stats.puntos_totales || 0}</span>
          </div>
          <div className="flex justify-between items-center font-bold text-gray-500">
            <span>3P</span> <span className="text-[6px] md:text-[8px] lg:text-[11px]">{stats.triples_anotados || 0}</span>
          </div>
          <div className="flex justify-between items-center font-bold text-gray-500">
            <span>TL</span> <span className="text-[6px] md:text-[8px] lg:text-[11px]">{stats.tiros_libres_anotados || 0}</span>
          </div>
        </div>

        <button onClick={() => sustituirJugador(jugador, tipoEquipo, 'salir')} className="mt-0.5 lg:mt-1 text-[5px] md:text-[6.5px] lg:text-[8px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-0.5 lg:px-1 py-0.2 lg:py-0.5 rounded font-bold w-full">
          ⬇️ Salir
        </button>
      </div>
    );
  };

  return (
    <main className="container mx-auto py-1 px-1 max-w-[1400px]">
      {/* MARCADOR GLOBAL EN VIVO (Con Controles de Puntaje Directo) */}
      <div className="bg-gray-900 rounded-xl p-2 mb-1.5 shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-1.5">
        
        {/* EQUIPO LOCAL */}
        <div className="flex flex-col items-center md:w-1/3">
          <span className="text-[8px] font-bold text-blue-400 tracking-wider mb-1">LOCAL</span>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shrink-0 mb-1 overflow-hidden border border-gray-600 shadow-sm">
            {partido?.local?.logo_url ? (
              <img src={partido.local.logo_url} alt={partido.local.nombre} className="w-full h-full object-contain p-0.5" />
            ) : (
              <span className="text-gray-900 font-black text-xs">{partido?.local?.nombre?.charAt(0) || 'L'}</span>
            )}
          </div>
          <h2 className="text-xs md:text-base font-black uppercase text-center line-clamp-1">{partido?.local?.nombre}</h2>
        </div>

        {/* CENTRO: MARCADOR GLOBAL, CONTROLES MANUALES Y SELECTOR DE CUARTOS */}
        <div className="flex flex-col items-center justify-center bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700 shrink-0">
          <div className="flex items-center gap-2 md:gap-4 mb-1">
            
            {/* Controles de Score Local */}
            <div className="flex items-center gap-1.5">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => ajustarScoreManual('local', 'sumar')} className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-green-400 rounded text-[10px] font-black transition-colors" title="Sumar punto global local">+</button>
                <button onClick={() => ajustarScoreManual('local', 'restar')} className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-red-400 rounded text-[10px] font-black transition-colors" title="Restar punto global local">-</button>
              </div>
              <span className="text-xl md:text-3xl font-black text-yellow-400 w-8 md:w-12 text-center leading-none">{scoreLocal}</span>
            </div>

            <span className="text-sm md:text-base text-gray-500 font-black">-</span>

            {/* Controles de Score Visitante */}
            <div className="flex items-center gap-1.5">
              <span className="text-xl md:text-3xl font-black text-yellow-400 w-8 md:w-12 text-center leading-none">{scoreVisitante}</span>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => ajustarScoreManual('visitante', 'sumar')} className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-green-400 rounded text-[10px] font-black transition-colors" title="Sumar punto global visitante">+</button>
                <button onClick={() => ajustarScoreManual('visitante', 'restar')} className="w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-red-400 rounded text-[10px] font-black transition-colors" title="Restar punto global visitante">-</button>
              </div>
            </div>

          </div>
          
          <div className="flex items-center gap-1 bg-gray-900/80 p-0.5 rounded-lg border border-gray-700">
            {['1Q', '2Q', '3Q', '4Q', 'Extra'].map(q => (
              <button
                key={q}
                onClick={() => cambiarPeriodo(q)}
                className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${
                  partido?.periodo_actual === q 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* EQUIPO VISITANTE */}
        <div className="flex flex-col items-center md:w-1/3">
          <span className="text-[8px] font-bold text-red-400 tracking-wider mb-1">VISITANTE</span>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shrink-0 mb-1 overflow-hidden border border-gray-600 shadow-sm">
            {partido?.visitante?.logo_url ? (
              <img src={partido.visitante.logo_url} alt={partido.visitante.nombre} className="w-full h-full object-contain p-0.5" />
            ) : (
              <span className="text-gray-900 font-black text-xs">{partido?.visitante?.nombre?.charAt(0) || 'V'}</span>
            )}
          </div>
          <h2 className="text-xs md:text-base font-black uppercase text-center line-clamp-1">{partido?.visitante?.nombre}</h2>
        </div>

      </div>

      {/* SELECTOR DE MODO (SUMAR VS RESTAR) */}
      <div className="bg-white rounded-xl p-1 mb-1.5 shadow-sm border border-gray-200 flex justify-center items-center gap-3">
        <span className="text-[10px] font-black text-gray-700 uppercase">Modo:</span>
        <div className="flex bg-gray-100 p-0.5 rounded-lg">
          <button 
            onClick={() => setModoOperacion('sumar')} 
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-black transition-all ${modoOperacion === 'sumar' ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
          >
            ➕ Sumar
          </button>
          <button 
            onClick={() => setModoOperacion('restar')} 
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-black transition-all ${modoOperacion === 'restar' ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
          >
            ➖ Restar / Corregir
          </button>
        </div>
      </div>

      {/* LAYOUT DE 3 COLUMNAS: LATERALES 22%, CANCHA 56% PARA ACOMODAR LAS TARJETAS 2,2,1 */}
      <div className="flex flex-col lg:flex-row gap-1.5 mb-1.5 items-stretch lg:justify-center">
        
        {/* COLUMNA IZQUIERDA: EQUIPO LOCAL EN CANCHA */}
        <div className="w-full lg:w-[22%] lg:min-w-[180px] bg-blue-50/50 rounded-xl p-1.5 lg:p-2 border-2 border-blue-100 shadow-inner order-2 lg:order-1 flex flex-col justify-start">
          <div className="w-full flex justify-between items-center mb-0.5 border-b border-blue-200 pb-0.5">
            <span className="font-black text-blue-800 text-[9px] lg:text-[11px] uppercase tracking-wide truncate max-w-[75%]">
              {partido?.local?.nombre || 'Local'}
            </span>
            <span className="text-[7.5px] bg-blue-600 text-white px-1 py-0.2 rounded">{canchaLocal.length}/5</span>
          </div>
          
          <div className="flex flex-row lg:flex-wrap justify-between lg:justify-center items-center gap-0.5 lg:gap-1.5 w-full flex-1 my-0.5 lg:my-2">
            {canchaLocal.map(jugador => (
              <JugadorCancha key={jugador.id} jugador={jugador} equipo={partido.equipo_local_id} tipoEquipo="local" />
            ))}
          </div>

          <button 
            onClick={() => setModalBanca('local')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[9px] lg:text-[10px] font-black py-1 px-1.5 rounded-lg shadow transition-all uppercase tracking-wide flex items-center justify-center gap-1 mt-auto"
          >
            🔄 Banca ({bancaLocal.length})
          </button>
        </div>

        {/* COLUMNA CENTRAL: CANCHA INTERACTIVA FULL COURT (MÁS ANCHA: lg:w-[56%]) */}
        <div className="w-full lg:w-[56%] flex flex-col items-center order-1 lg:order-2">
          <div className="bg-white rounded-xl p-1.5 w-full shadow-sm border-2 border-gray-200 flex flex-col items-center">
            <p className="text-[10px] md:text-xs font-black text-gray-800 uppercase mb-1 text-center">
              1. Toca la zona {modoOperacion === 'restar' ? 'para RESTAR' : 'para SUMAR'}
            </p>
            
            {/* DIBUJO DE LA CANCHA COMPLETA */}
            <div className="relative w-full aspect-[2/1] bg-gray-800 border-2 border-white overflow-hidden mx-auto shadow-md rounded-sm">
               
               {/* LÍNEA Y CÍRCULO CENTRAL */}
               <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white -translate-x-1/2 pointer-events-none z-20" />
               <div className="absolute top-1/2 left-1/2 w-8 h-8 md:w-14 md:h-14 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20" />

               {/* MITAD IZQUIERDA */}
               <div 
                 className={`absolute top-0 bottom-0 left-0 w-1/2 cursor-pointer flex items-center justify-start pl-1.5 transition-colors duration-200 z-0 ${accionPendiente === 't3' ? (modoOperacion === 'sumar' ? 'bg-yellow-400' : 'bg-red-500') : 'bg-gray-800 hover:bg-gray-700'}`}
                 onClick={() => setAccionPendiente('t3')}
               >
                 <span className={`font-black text-[9px] md:text-[11px] pointer-events-none -rotate-90 transition-colors ${accionPendiente === 't3' ? 'text-gray-900' : 'text-white/40'}`}>3 PTS</span>
               </div>
               
               <div 
                 className={`absolute top-[10%] bottom-[10%] left-0 w-[45%] border-2 border-white rounded-r-full cursor-pointer flex items-center justify-end pr-1.5 transition-colors duration-200 z-10 ${accionPendiente === 'd2' ? (modoOperacion === 'sumar' ? 'bg-yellow-400' : 'bg-red-500') : 'bg-blue-600 hover:bg-blue-500'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('d2'); }}
               >
                 <span className={`font-black text-[8px] md:text-[11px] pointer-events-none transition-colors ${accionPendiente === 'd2' ? 'text-gray-900' : 'text-white/80'}`}>2 PTS</span>
               </div>

               <div 
                 className={`absolute top-[35%] bottom-[35%] left-0 w-[25%] border-2 border-white cursor-pointer transition-colors duration-200 z-20 ${accionPendiente === 'd2' ? (modoOperacion === 'sumar' ? 'bg-yellow-400' : 'bg-red-500') : 'bg-blue-800 hover:bg-blue-700'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('d2'); }}
               ></div>

               {/* CÍRCULO TIRO LIBRE IZQUIERDO */}
               <div 
                 className={`absolute top-1/2 left-[25%] w-9 h-9 md:w-14 md:h-14 border-[3px] border-white rounded-full -translate-y-1/2 -translate-x-1/2 cursor-pointer flex items-center justify-center transition-colors duration-200 z-30 ${accionPendiente === 'tl' ? (modoOperacion === 'sumar' ? 'bg-yellow-400' : 'bg-red-500') : 'bg-red-600 hover:bg-red-500'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('tl'); }}
               >
                 <span className={`font-black text-[7px] md:text-[10px] pointer-events-none transition-colors ${accionPendiente === 'tl' ? 'text-gray-900' : 'text-white'}`}>1 PT</span>
               </div>
               
               <div className="absolute top-1/2 left-2 w-2 h-2 md:w-3 md:h-3 border border-orange-400 rounded-full -translate-y-1/2 pointer-events-none bg-orange-200/50 z-40" />

               {/* MITAD DERECHA */}
               <div 
                 className={`absolute top-0 bottom-0 right-0 w-1/2 cursor-pointer flex items-center justify-end pr-1.5 transition-colors duration-200 z-0 ${accionPendiente === 't3' ? (modoOperacion === 'sumar' ? 'bg-yellow-400' : 'bg-red-500') : 'bg-gray-800 hover:bg-gray-700'}`}
                 onClick={() => setAccionPendiente('t3')}
               >
                 <span className={`font-black text-[9px] md:text-[11px] pointer-events-none rotate-90 transition-colors ${accionPendiente === 't3' ? 'text-gray-900' : 'text-white/40'}`}>3 PTS</span>
               </div>
               
               <div 
                 className={`absolute top-[10%] bottom-[10%] right-0 w-[45%] border-2 border-white rounded-l-full cursor-pointer flex items-center justify-start pl-1.5 transition-colors duration-200 z-10 ${accionPendiente === 'd2' ? (modoOperacion === 'sumar' ? 'bg-yellow-400' : 'bg-red-500') : 'bg-blue-600 hover:bg-blue-500'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('d2'); }}
               >
                 <span className={`font-black text-[8px] md:text-[11px] pointer-events-none transition-colors ${accionPendiente === 'd2' ? 'text-gray-900' : 'text-white/80'}`}>2 PTS</span>
               </div>

               <div 
                 className={`absolute top-[35%] bottom-[35%] right-0 w-[25%] border-2 border-white cursor-pointer transition-colors duration-200 z-20 ${accionPendiente === 'd2' ? (modoOperacion === 'sumar' ? 'bg-yellow-400' : 'bg-red-500') : 'bg-blue-800 hover:bg-blue-700'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('d2'); }}
               ></div>

               {/* CÍRCULO TIRO LIBRE DERECHO */}
               <div 
                 className={`absolute top-1/2 right-[25%] w-9 h-9 md:w-14 md:h-14 border-[3px] border-white rounded-full -translate-y-1/2 translate-x-1/2 cursor-pointer flex items-center justify-center transition-colors duration-200 z-30 ${accionPendiente === 'tl' ? (modoOperacion === 'sumar' ? 'bg-yellow-400' : 'bg-red-500') : 'bg-red-600 hover:bg-red-500'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('tl'); }}
               >
                 <span className={`font-black text-[7px] md:text-[10px] pointer-events-none transition-colors ${accionPendiente === 'tl' ? 'text-gray-900' : 'text-white'}`}>1 PT</span>
               </div>

               <div className="absolute top-1/2 right-2 w-2 h-2 md:w-3 md:h-3 border border-orange-400 rounded-full -translate-y-1/2 pointer-events-none bg-orange-200/50 z-40" />

            </div>

            {/* INDICADOR DE ACCIÓN */}
            <div className="mt-1 w-full h-10">
              {accionPendiente ? (
                <div className={`${modoOperacion === 'sumar' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' : 'bg-red-50 border-red-500 text-red-800'} border px-1.5 py-0.5 rounded-lg text-center shadow-sm animate-pulse h-full flex flex-col justify-center`}>
                  <p className="font-black text-[10px] uppercase">
                    {accionPendiente === 't3' ? '🔥 TRIPLE (3 PTS)' : accionPendiente === 'd2' ? '🏀 DOBLE (2 PTS)' : '🎯 TIRO LIBRE (1 PT)'} ({modoOperacion === 'sumar' ? 'SUMAR' : 'RESTAR'})
                  </p>
                  <p className="font-bold text-[7.5px]">¡Toca la camiseta del jugador!</p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-lg text-center h-full flex flex-col justify-center">
                  <p className="text-gray-500 font-bold text-[9px]">Modo: <span className={modoOperacion === 'sumar' ? 'text-green-600 font-black' : 'text-red-600 font-black'}>{modoOperacion === 'sumar' ? 'SUMANDO' : 'RESTANDO'}</span></p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: EQUIPO VISITANTE EN CANCHA */}
        <div className="w-full lg:w-[22%] lg:min-w-[180px] bg-red-50/50 rounded-xl p-1.5 lg:p-2 border-2 border-red-100 shadow-inner order-3 flex flex-col justify-start">
          <div className="w-full flex justify-between items-center mb-0.5 border-b border-red-200 pb-0.5">
            <span className="font-black text-red-800 text-[9px] lg:text-[11px] uppercase tracking-wide truncate max-w-[75%]">
              {partido?.visitante?.nombre || 'Visita'}
            </span>
            <span className="text-[7.5px] bg-red-600 text-white px-1 py-0.2 rounded">{canchaVisitante.length}/5</span>
          </div>
          
          <div className="flex flex-row lg:flex-wrap justify-between lg:justify-center items-center gap-0.5 lg:gap-1.5 w-full flex-1 my-0.5 lg:my-2">
            {canchaVisitante.map(jugador => (
              <JugadorCancha key={jugador.id} jugador={jugador} equipo={partido.equipo_visitante_id} tipoEquipo="visitante" />
            ))}
          </div>

          <button 
            onClick={() => setModalBanca('visitante')}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-[9px] lg:text-[10px] font-black py-1 px-1.5 rounded-lg shadow transition-all uppercase tracking-wide flex items-center justify-center gap-1 mt-auto"
          >
            🔄 Banca ({bancaVisitante.length})
          </button>
        </div>

      </div>

      {/* 🏀 MODAL DESPLEGABLE DE BANCA */}
      {modalBanca && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border-4 border-gray-100 flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-black text-base uppercase text-gray-900">
                Sustituciones Banca {modalBanca === 'local' ? partido?.local?.nombre : partido?.visitante?.nombre}
              </h3>
              <button 
                onClick={() => setModalBanca(null)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-black text-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 font-bold mb-3">
              Selecciona un jugador de la banca (ordenados por número):
            </p>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              {(modalBanca === 'local' ? bancaLocal : bancaVisitante).length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">No hay jugadores disponibles en la banca.</p>
              ) : (
                (modalBanca === 'local' ? bancaLocal : bancaVisitante).map(jugador => (
                  <div key={jugador.id} className="flex justify-between items-center bg-gray-50 hover:bg-blue-50 p-2.5 rounded-xl border border-gray-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-black shadow-sm">
                        #{jugador.numero}
                      </span>
                      <span className="text-xs font-bold text-gray-800 uppercase">{jugador.nombre}</span>
                    </div>
                    <button 
                      onClick={() => {
                        sustituirJugador(jugador, modalBanca, 'entrar');
                        setModalBanca(null);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-black px-3 py-1.5 rounded-lg shadow transition-all uppercase"
                    >
                      ⬆️ Entrar
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t text-center">
              <button 
                onClick={() => setModalBanca(null)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-black py-2.5 rounded-xl uppercase"
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Botones de Control de Partido (FINALIZAR Y REVERTIR) */}
      <div className="flex flex-col items-center gap-2 mt-2 mb-2">
        <button onClick={finalizarPartido} className="bg-gray-900 hover:bg-black text-white font-black px-4 py-2 rounded-xl shadow-md transition-all uppercase tracking-widest text-[10px] border-b-2 border-gray-700 active:border-b-0">
          Pitar Final del Partido
        </button>
        
        {partido?.estado === 'en curso' && (
          <button 
            onClick={revertirAProgramado} 
            className="text-gray-500 hover:text-red-600 text-[9px] font-bold underline transition-colors"
          >
            ⏪ Devolver partido a "Programado"
          </button>
        )}
      </div>
    </main>
  );
}
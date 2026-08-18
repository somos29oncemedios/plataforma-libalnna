'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../supabase';

export default function MesaTecnicaPartido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [partido, setPartido] = useState<any>(null);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [editandoDespuesDeFinalizar, setEditandoDespuesDeFinalizar] = useState(false);

  // 🏀 ESTADOS PARA DIVIDIR CANCHA Y BANCA
  const [canchaLocal, setCanchaLocal] = useState<any[]>([]);
  const [bancaLocal, setBancaLocal] = useState<any[]>([]);
  const [canchaVisitante, setCanchaVisitante] = useState<any[]>([]);
  const [bancaVisitante, setBancaVisitante] = useState<any[]>([]);

  // 🏀 ESTADO PARA MODAL DE BANCA
  const [modalBanca, setModalBanca] = useState<'local' | 'visitante' | null>(null);

  // 🏀 ESTADO PARA LA MEMORIA MUSCULAR (El tiro previo)
  const [accionPendiente, setAccionPendiente] = useState<'tl' | 'd2' | 't3' | null>(null);

  const cargarPartido = async () => {
    const { data: partidoData } = await supabase
      .from('partidos')
      .select('*, local:equipos!equipo_local_id(nombre, logo_url), visitante:equipos!equipo_visitante_id(nombre, logo_url)')
      .eq('id', id)
      .single();

    if (partidoData) {
      setPartido(partidoData);

      const { data: jugadoresData } = await supabase
        .from('jugadores')
        .select('*')
        .in('equipo_id', [partidoData.equipo_local_id, partidoData.equipo_visitante_id])
        .order('numero', { ascending: true });

      if (jugadoresData) {
        const localTeam = jugadoresData.filter((j: any) => j.equipo_id === partidoData.equipo_local_id);
        const visitorTeam = jugadoresData.filter((j: any) => j.equipo_id === partidoData.equipo_visitante_id);

        setCanchaLocal(localTeam.slice(0, 5));
        setBancaLocal(localTeam.slice(5));

        setCanchaVisitante(visitorTeam.slice(0, 5));
        setBancaVisitante(visitorTeam.slice(5));
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
    let nuevoValor = operacion === 'sumar' ? valorActual + 1 : Math.max(0, valorActual - 1);
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
    anotarEstadistica(jugador.id, equipoId, accionPendiente, 'sumar');
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

  // COMPONENTE DE JUGADOR EN CANCHA (Ajustado en tamaño y compacto)
  const JugadorCancha = ({ jugador, equipo, tipoEquipo }: { jugador: any, equipo: string, tipoEquipo: 'local'|'visitante' }) => {
    const stats = estadisticas?.[jugador.id] || { puntos_totales: 0, tiros_libres_anotados: 0, triples_anotados: 0 };
    return (
      <div className={`flex flex-col items-center bg-white p-1.5 md:p-2 rounded-lg border-2 shadow-sm relative w-[18%] lg:w-full transition-all ${accionPendiente ? 'border-yellow-400 scale-105 shadow-yellow-200' : 'border-gray-200'}`}>
        <button 
          onClick={() => clickCamisetaJugador(jugador, equipo)}
          className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center font-black text-sm md:text-lg shadow-md transition-transform hover:scale-110 mb-1 ${tipoEquipo === 'local' ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-red-600 text-white hover:bg-red-500'} ${accionPendiente ? 'animate-pulse ring-2 ring-yellow-400' : ''}`}
        >
          {jugador.numero}
        </button>
        <span className="text-[7px] md:text-[8px] font-black uppercase text-gray-800 text-center leading-tight truncate w-full mb-0.5">{jugador.nombre}</span>
        
        <div className="w-full bg-gray-50 border border-gray-100 rounded flex flex-col p-0.5 text-[6px] md:text-[7.5px] gap-0.2">
          <div className="flex justify-between font-black text-blue-700 border-b border-gray-200 pb-0.2 mb-0.2">
            <span>PTS</span> <span>{stats.puntos_totales || 0}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-500">
            <span>3P</span> <span>{stats.triples_anotados || 0}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-500">
            <span>TL</span> <span>{stats.tiros_libres_anotados || 0}</span>
          </div>
        </div>

        <button onClick={() => sustituirJugador(jugador, tipoEquipo, 'salir')} className="mt-1 text-[6px] md:text-[7.5px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-1 py-0.5 rounded font-bold w-full">
          ⬇️ Salir
        </button>
      </div>
    );
  };

  return (
    <main className="container mx-auto py-3 px-2 max-w-[1400px]">
      {/* MARCADOR GLOBAL EN VIVO (Ultra compacto) */}
      <div className="bg-gray-900 rounded-xl p-3 mb-3 shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex flex-col items-center md:w-1/3">
          <span className="text-[10px] font-bold text-blue-400 tracking-wider">LOCAL</span>
          <h2 className="text-sm md:text-xl font-black uppercase text-center line-clamp-1">{partido?.local?.nombre}</h2>
        </div>
        <div className="flex flex-col items-center justify-center bg-gray-800 px-5 py-1.5 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl md:text-4xl font-black text-yellow-400">{scoreLocal}</span>
            <span className="text-lg text-gray-500">-</span>
            <span className="text-2xl md:text-4xl font-black text-yellow-400">{scoreVisitante}</span>
          </div>
          <span className="text-blue-400 font-bold text-[9px] md:text-[10px]">PERÍODO: {partido?.periodo_actual || '1Q'}</span>
        </div>
        <div className="flex flex-col items-center md:w-1/3">
          <span className="text-[10px] font-bold text-red-400 tracking-wider">VISITANTE</span>
          <h2 className="text-sm md:text-xl font-black uppercase text-center line-clamp-1">{partido?.visitante?.nombre}</h2>
        </div>
      </div>

      {/* 🏀 LAYOUT DE 3 COLUMNAS: DISTRIBUIDAS EXACTAMENTE AL ALTO DE LA CANCHA */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4 items-stretch">
        
        {/* COLUMNA IZQUIERDA: LOCAL EN CANCHA (Ocupa el alto exacto distribuyendose de arriba a abajo) */}
        <div className="w-full lg:w-1/4 bg-blue-50/50 rounded-2xl p-2.5 border-2 border-blue-100 shadow-inner order-2 lg:order-1 flex flex-col justify-between">
          <div className="w-full flex justify-between items-center mb-1 border-b-2 border-blue-200 pb-1">
            <span className="font-black text-blue-800 text-[11px] uppercase">Local En Cancha</span>
            <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-lg">{canchaLocal.length}/5</span>
          </div>
          
          {/* Los 5 jugadores se distribuyen verticalmente llenando el espacio sin rebasar */}
          <div className="flex flex-row lg:flex-col justify-between items-center gap-1 w-full flex-1 my-1">
            {canchaLocal.map(jugador => (
              <JugadorCancha key={jugador.id} jugador={jugador} equipo={partido.equipo_local_id} tipoEquipo="local" />
            ))}
          </div>

          <button 
            onClick={() => setModalBanca('local')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black py-1.5 px-2 rounded-xl shadow transition-all uppercase tracking-wide flex items-center justify-center gap-1 mt-1"
          >
            🔄 Sustituciones Banca ({bancaLocal.length})
          </button>
        </div>

        {/* COLUMNA CENTRAL: CANCHA INTERACTIVA FULL COURT */}
        <div className="w-full lg:w-2/4 flex flex-col items-center order-1 lg:order-2">
          <div className="bg-white rounded-2xl p-2.5 w-full shadow-sm border-2 border-gray-200 flex flex-col items-center">
            <p className="text-xs md:text-sm font-black text-gray-800 uppercase mb-2 text-center">
              1. Toca la zona desde donde se lanzó
            </p>
            
            {/* DIBUJO DE LA CANCHA COMPLETA */}
            <div className="relative w-full aspect-[2/1] bg-gray-800 border-2 border-white overflow-hidden mx-auto shadow-md rounded-sm">
               
               {/* LÍNEA Y CÍRCULO CENTRAL */}
               <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white -translate-x-1/2 pointer-events-none z-20" />
               <div className="absolute top-1/2 left-1/2 w-12 h-12 md:w-20 md:h-20 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20" />

               {/* MITAD IZQUIERDA */}
               <div 
                 className={`absolute top-0 bottom-0 left-0 w-1/2 cursor-pointer flex items-center justify-start pl-2 transition-colors duration-200 z-0 ${accionPendiente === 't3' ? 'bg-yellow-400' : 'bg-gray-800 hover:bg-gray-700'}`}
                 onClick={() => setAccionPendiente('t3')}
               >
                 <span className={`font-black text-xs md:text-sm pointer-events-none -rotate-90 transition-colors ${accionPendiente === 't3' ? 'text-gray-900' : 'text-white/40'}`}>3 PTS</span>
               </div>
               
               <div 
                 className={`absolute top-[10%] bottom-[10%] left-0 w-[45%] border-2 border-white rounded-r-full cursor-pointer flex items-center justify-end pr-2 transition-colors duration-200 z-10 ${accionPendiente === 'd2' ? 'bg-yellow-400' : 'bg-blue-600 hover:bg-blue-500'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('d2'); }}
               >
                 <span className={`font-black text-[10px] md:text-sm pointer-events-none transition-colors ${accionPendiente === 'd2' ? 'text-gray-900' : 'text-white/80'}`}>2 PTS</span>
               </div>

               <div 
                 className={`absolute top-[35%] bottom-[35%] left-0 w-[25%] border-2 border-white cursor-pointer transition-colors duration-200 z-20 ${accionPendiente === 'd2' ? 'bg-yellow-400' : 'bg-blue-800 hover:bg-blue-700'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('d2'); }}
               ></div>

               <div 
                 className={`absolute top-1/2 left-[25%] w-8 h-8 md:w-12 md:h-12 border-2 border-white rounded-full -translate-y-1/2 -translate-x-1/2 cursor-pointer flex items-center justify-center transition-colors duration-200 z-30 ${accionPendiente === 'tl' ? 'bg-yellow-400' : 'bg-red-600 hover:bg-red-500'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('tl'); }}
               >
                 <span className={`font-black text-[7px] md:text-[10px] pointer-events-none transition-colors ${accionPendiente === 'tl' ? 'text-gray-900' : 'text-white'}`}>1 PT</span>
               </div>
               
               <div className="absolute top-1/2 left-2 w-3 h-3 md:w-5 md:h-5 border-2 border-orange-400 rounded-full -translate-y-1/2 pointer-events-none bg-orange-200/50 z-40" />

               {/* MITAD DERECHA */}
               <div 
                 className={`absolute top-0 bottom-0 right-0 w-1/2 cursor-pointer flex items-center justify-end pr-2 transition-colors duration-200 z-0 ${accionPendiente === 't3' ? 'bg-yellow-400' : 'bg-gray-800 hover:bg-gray-700'}`}
                 onClick={() => setAccionPendiente('t3')}
               >
                 <span className={`font-black text-xs md:text-sm pointer-events-none rotate-90 transition-colors ${accionPendiente === 't3' ? 'text-gray-900' : 'text-white/40'}`}>3 PTS</span>
               </div>
               
               <div 
                 className={`absolute top-[10%] bottom-[10%] right-0 w-[45%] border-2 border-white rounded-l-full cursor-pointer flex items-center justify-start pl-2 transition-colors duration-200 z-10 ${accionPendiente === 'd2' ? 'bg-yellow-400' : 'bg-blue-600 hover:bg-blue-500'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('d2'); }}
               >
                 <span className={`font-black text-[10px] md:text-sm pointer-events-none transition-colors ${accionPendiente === 'd2' ? 'text-gray-900' : 'text-white/80'}`}>2 PTS</span>
               </div>

               <div 
                 className={`absolute top-[35%] bottom-[35%] right-0 w-[25%] border-2 border-white cursor-pointer transition-colors duration-200 z-20 ${accionPendiente === 'd2' ? 'bg-yellow-400' : 'bg-blue-800 hover:bg-blue-700'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('d2'); }}
               ></div>

               <div 
                 className={`absolute top-1/2 right-[25%] w-8 h-8 md:w-12 md:h-12 border-2 border-white rounded-full -translate-y-1/2 translate-x-1/2 cursor-pointer flex items-center justify-center transition-colors duration-200 z-30 ${accionPendiente === 'tl' ? 'bg-yellow-400' : 'bg-red-600 hover:bg-red-500'}`}
                 onClick={(e) => { e.stopPropagation(); setAccionPendiente('tl'); }}
               >
                 <span className={`font-black text-[7px] md:text-[10px] pointer-events-none transition-colors ${accionPendiente === 'tl' ? 'text-gray-900' : 'text-white'}`}>1 PT</span>
               </div>

               <div className="absolute top-1/2 right-2 w-3 h-3 md:w-5 md:h-5 border-2 border-orange-400 rounded-full -translate-y-1/2 pointer-events-none bg-orange-200/50 z-40" />

            </div>

            {/* INDICADOR DE ACCIÓN COMPACTO */}
            <div className="mt-2 w-full h-14">
              {accionPendiente ? (
                <div className="bg-yellow-50 border-2 border-yellow-400 px-2 py-1 rounded-xl text-center shadow-sm animate-pulse h-full flex flex-col justify-center">
                  <p className="text-yellow-800 font-black text-xs uppercase">
                    {accionPendiente === 't3' ? '🔥 TRIPLE (3 PTS)' : accionPendiente === 'd2' ? '🏀 DOBLE (2 PTS)' : '🎯 TIRO LIBRE (1 PT)'}
                  </p>
                  <p className="text-yellow-700 font-bold text-[9px]">¡Toca la camiseta del jugador!</p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 px-2 py-1 rounded-xl text-center h-full flex flex-col justify-center">
                  <p className="text-gray-500 font-bold text-xs">Esperando zona de lanzamiento...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: VISITANTE EN CANCHA (Ocupa el alto exacto) */}
        <div className="w-full lg:w-1/4 bg-red-50/50 rounded-2xl p-2.5 border-2 border-red-100 shadow-inner order-3 flex flex-col justify-between">
          <div className="w-full flex justify-between items-center mb-1 border-b-2 border-red-200 pb-1">
            <span className="font-black text-red-800 text-[11px] uppercase">Visita En Cancha</span>
            <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-lg">{canchaVisitante.length}/5</span>
          </div>
          
          <div className="flex flex-row lg:flex-col justify-between items-center gap-1 w-full flex-1 my-1">
            {canchaVisitante.map(jugador => (
              <JugadorCancha key={jugador.id} jugador={jugador} equipo={partido.equipo_visitante_id} tipoEquipo="visitante" />
            ))}
          </div>

          <button 
            onClick={() => setModalBanca('visitante')}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-black py-1.5 px-2 rounded-xl shadow transition-all uppercase tracking-wide flex items-center justify-center gap-1 mt-1"
          >
            🔄 Sustituciones Banca ({bancaVisitante.length})
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

      {/* Botón Finalizar Partido */}
      <div className="flex justify-center mt-4 mb-2">
        <button onClick={finalizarPartido} className="bg-gray-900 hover:bg-black text-white font-black px-6 py-2.5 rounded-xl shadow-xl transition-all uppercase tracking-widest text-xs border-b-4 border-gray-700 active:border-b-0">
          Pitar Final del Partido
        </button>
      </div>
    </main>
  );
}
'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../supabase';

export default function MesaTecnicaPartido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [partido, setPartido] = useState<any>(null);
  const [rosterLocal, setRosterLocal] = useState<any[]>([]);
  const [rosterVisitante, setRosterVisitante] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>({});
  const [cargando, setCargando] = useState(true);
  
  // Estado para permitir editar un partido ya finalizado temporalmente
  const [editandoDespuesDeFinalizar, setEditandoDespuesDeFinalizar] = useState(false);

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
        setRosterLocal(jugadoresData.filter((j: any) => j.equipo_id === partidoData.equipo_local_id));
        setRosterVisitante(jugadoresData.filter((j: any) => j.equipo_id === partidoData.equipo_visitante_id));
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

  // 🏀 FUNCIÓN MAESTRA CON SINCRONIZACIÓN AUTOMÁTICA EN TIEMPO REAL
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
      if (operacion === 'sumar') {
        nuevosPuntos += 1;
        nuevosTL += 1;
      } else {
        nuevosPuntos = Math.max(0, nuevosPuntos - 1);
        nuevosTL = Math.max(0, nuevosTL - 1);
      }
    } else if (tipo === 'd2') {
      if (operacion === 'sumar') {
        nuevosPuntos += 2;
      } else {
        nuevosPuntos = Math.max(0, nuevosPuntos - 2);
      }
    } else if (tipo === 't3') {
      if (operacion === 'sumar') {
        nuevosPuntos += 3;
        nuevosTriples += 1;
      } else {
        nuevosPuntos = Math.max(0, nuevosPuntos - 3);
        nuevosTriples = Math.max(0, nuevosTriples - 1);
      }
    }

    const datosActualizados = {
      puntos_totales: nuevosPuntos,
      tiros_libres_anotados: nuevosTL,
      triples_anotados: nuevosTriples
    };

    let error = null;
    let registroExistente = estadisticas[jugadorId];

    if (registroExistente && registroExistente.id) {
      const res = await supabase
        .from('box_scores')
        .update(datosActualizados)
        .eq('id', registroExistente.id);
      error = res.error;
    } else {
      const { data: existingRow } = await supabase
        .from('box_scores')
        .select('id')
        .eq('partido_id', id)
        .eq('jugador_id', jugadorId)
        .maybeSingle();

      if (existingRow && existingRow.id) {
        const res = await supabase
          .from('box_scores')
          .update(datosActualizados)
          .eq('id', existingRow.id);
        error = res.error;
        registroExistente = { ...existingRow };
      } else {
        const res = await supabase
          .from('box_scores')
          .insert([{
            partido_id: id,
            jugador_id: jugadorId,
            equipo_id: equipoId,
            ...datosActualizados
          }])
          .select()
          .single();

        error = res.error;
        if (!error && res.data) {
          const nuevasEstatsMap = {
            ...estadisticas,
            [jugadorId]: res.data
          };
          setEstadisticas(nuevasEstatsMap);
          sincronizarPuntosGlobales(nuevasEstatsMap, partido?.score_manual_local || 0, partido?.score_manual_visitante || 0);
          return;
        }
      }
    }

    if (!error) {
      const nuevasEstatsMap = {
        ...estadisticas,
        [jugadorId]: {
          ...(estadisticas[jugadorId] || { partido_id: id, jugador_id: jugadorId, equipo_id: equipoId }),
          ...datosActualizados,
          id: registroExistente?.id || estadisticas[jugadorId]?.id
        }
      };
      setEstadisticas(nuevasEstatsMap);
      sincronizarPuntosGlobales(nuevasEstatsMap, partido?.score_manual_local || 0, partido?.score_manual_visitante || 0);
    } else {
      console.error("Error al actualizar marcador:", error);
      alert(`❌ Error técnico de Supabase: ${error.message}`);
    }
  };

  // 🏀 AJUSTE MANUAL DEL MARCADOR GLOBAL CON SINCRONIZACIÓN
  const ajustarScoreManual = async (equipo: 'local' | 'visitante', operacion: 'sumar' | 'restar') => {
    if (partidoBloqueado) return;

    const campo = equipo === 'local' ? 'score_manual_local' : 'score_manual_visitante';
    let valorActual = partido[campo] || 0;
    let nuevoValor = operacion === 'sumar' ? valorActual + 1 : Math.max(0, valorActual - 1);

    const manualLocal = equipo === 'local' ? nuevoValor : (partido?.score_manual_local || 0);
    const manualVis = equipo === 'visitante' ? nuevoValor : (partido?.score_manual_visitante || 0);

    let sLocal = 0;
    let sVis = 0;
    Object.values(estadisticas).forEach((stat: any) => {
      if (stat.equipo_id === partido?.equipo_local_id) sLocal += (stat.puntos_totales || 0);
      if (stat.equipo_id === partido?.equipo_visitante_id) sVis += (stat.puntos_totales || 0);
    });

    const finalSLocal = Math.max(0, sLocal + manualLocal);
    const finalSVis = Math.max(0, sVis + manualVis);

    const { error } = await supabase
      .from('partidos')
      .update({ 
        [campo]: nuevoValor,
        puntos_local: finalSLocal,
        puntos_visitante: finalSVis
      })
      .eq('id', id);

    if (!error) {
      setPartido({ 
        ...partido, 
        [campo]: nuevoValor,
        puntos_local: finalSLocal,
        puntos_visitante: finalSVis
      });
    } else {
      alert(`❌ Error al ajustar score: ${error.message}`);
    }
  };

  // 🏀 FUNCIÓN PARA GUARDAR Y SINCRONIZAR AUTOMÁTICAMENTE EN LA TABLA PARTIDOS
  const sincronizarPuntosGlobales = async (currentStats: any, manualLocal: number, manualVis: number) => {
    let sLocal = 0;
    let sVis = 0;
    
    Object.values(currentStats).forEach((stat: any) => {
      if (stat.equipo_id === partido?.equipo_local_id) sLocal += (stat.puntos_totales || 0);
      if (stat.equipo_id === partido?.equipo_visitante_id) sVis += (stat.puntos_totales || 0);
    });

    const finalSLocal = Math.max(0, sLocal + manualLocal);
    const finalSVis = Math.max(0, sVis + manualVis);

    await supabase
      .from('partidos')
      .update({ 
        puntos_local: finalSLocal,
        puntos_visitante: finalSVis
      })
      .eq('id', id);
  };

  // 🏀 CAMBIAR PERÍODO/CUARTO
  const cambiarPeriodo = async (nuevoPeriodo: string) => {
    if (partidoBloqueado) return;

    const { error } = await supabase
      .from('partidos')
      .update({ periodo_actual: nuevoPeriodo })
      .eq('id', id);

    if (!error) {
      setPartido({ ...partido, periodo_actual: nuevoPeriodo });
    }
  };

  // 🏀 CÁLCULO VISUAL EN VIVO
  let scoreJugadoresLocal = 0;
  let scoreJugadoresVisitante = 0;
  
  Object.values(estadisticas).forEach((stat: any) => {
    if (stat.equipo_id === partido?.equipo_local_id) scoreJugadoresLocal += (stat.puntos_totales || 0);
    if (stat.equipo_id === partido?.equipo_visitante_id) scoreJugadoresVisitante += (stat.puntos_totales || 0);
  });

  const scoreLocal = Math.max(0, scoreJugadoresLocal + (partido?.score_manual_local || 0));
  const scoreVisitante = Math.max(0, scoreJugadoresVisitante + (partido?.score_manual_visitante || 0));

  // 🏀 FINALIZAR O GUARDAR CAMBIOS
  const finalizarPartido = async () => {
    const confirmar = window.confirm("🛑 ¿Estás seguro de guardar el marcador definitivo y cerrar el panel del partido?");
    if (!confirmar) return;

    await sincronizarPuntosGlobales(estadisticas, partido?.score_manual_local || 0, partido?.score_manual_visitante || 0);

    const { error } = await supabase
      .from('partidos')
      .update({ estado: 'finalizado' })
      .eq('id', id);

    if (!error) {
      alert('✅ ¡Partido finalizado y marcador guardado con éxito!');
      setPartido({ ...partido, estado: 'finalizado' });
      setEditandoDespuesDeFinalizar(false);
    } else {
      alert(`❌ Error al finalizar el partido: ${error.message}`);
    }
  };

  if (cargando) return <div className="text-center py-20 font-bold text-gray-500">Preparando la Mesa Técnica...</div>;

  const JugadorRow = ({ jugador }: { jugador: any }) => {
    const stats = estadisticas[jugador.id] || { puntos_totales: 0, tiros_libres_anotados: 0, triples_anotados: 0 };
    return (
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-3 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-300 transition-colors">
        <div className="flex items-center gap-4 w-full md:w-1/3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-600 border border-gray-300 shrink-0">
            #{jugador.numero}
          </div>
          <div className="font-bold text-gray-900 uppercase leading-tight truncate">
            {jugador.nombre}
            <div className="text-xs text-blue-600 font-black mt-1">TOTAL PTS: {stats.puntos_totales}</div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 md:gap-5 w-full md:w-2/3">
          
          {/* Tiros Libres */}
          <div className="flex flex-col items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
            <span className="text-[10px] font-black text-gray-500 uppercase mb-1">T. Libre ({stats.tiros_libres_anotados})</span>
            <div className="flex gap-1">
              <button onClick={() => anotarEstadistica(jugador.id, jugador.equipo_id, 'tl', 'restar')} className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white w-8 h-8 rounded font-black transition-colors shadow-sm">-</button>
              <button onClick={() => anotarEstadistica(jugador.id, jugador.equipo_id, 'tl', 'sumar')} className="bg-green-100 text-green-700 hover:bg-green-500 hover:text-white w-10 h-8 rounded font-black transition-colors shadow-sm">+1</button>
            </div>
          </div>
          
          {/* Cesta de 2 */}
          <div className="flex flex-col items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
            <span className="text-[10px] font-black text-gray-500 uppercase mb-1">Doble</span>
            <div className="flex gap-1">
              <button onClick={() => anotarEstadistica(jugador.id, jugador.equipo_id, 'd2', 'restar')} className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white w-8 h-8 rounded font-black transition-colors shadow-sm">-</button>
              <button onClick={() => anotarEstadistica(jugador.id, jugador.equipo_id, 'd2', 'sumar')} className="bg-green-100 text-green-700 hover:bg-green-500 hover:text-white w-10 h-8 rounded font-black transition-colors shadow-sm">+2</button>
            </div>
          </div>

          {/* Triples */}
          <div className="flex flex-col items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
            <span className="text-[10px] font-black text-gray-500 uppercase mb-1">Triple ({stats.triples_anotados})</span>
            <div className="flex gap-1">
              <button onClick={() => anotarEstadistica(jugador.id, jugador.equipo_id, 't3', 'restar')} className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white w-8 h-8 rounded font-black transition-colors shadow-sm">-</button>
              <button onClick={() => anotarEstadistica(jugador.id, jugador.equipo_id, 't3', 'sumar')} className="bg-green-100 text-green-700 hover:bg-green-500 hover:text-white w-10 h-8 rounded font-black transition-colors shadow-sm">+3</button>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <main className="container mx-auto py-8 px-4 max-w-6xl">
      
      {/* AVISO DE EDICIÓN ACTIVA */}
      {partido?.estado === 'finalizado' && (
        <div className={`p-4 rounded-2xl mb-6 text-center font-bold flex flex-col sm:flex-row justify-between items-center gap-4 border ${editandoDespuesDeFinalizar ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-red-50 text-red-800 border-red-200'}`}>
          <span>
            {editandoDespuesDeFinalizar 
              ? '⚠️ MODO DE CORRECCIÓN ACTIVO: Los cambios se actualizan automáticamente en la vista de partidos.' 
              : '🛑 Este partido ha finalizado y se encuentra bloqueado.'}
          </span>
          <button 
            onClick={() => setEditandoDespuesDeFinalizar(!editandoDespuesDeFinalizar)} 
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm ${editandoDespuesDeFinalizar ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-gray-800 text-white hover:bg-gray-900'}`}
          >
            {editandoDespuesDeFinalizar ? '🔒 Bloquear Panel' : '🔓 Habilitar Edición'}
          </button>
        </div>
      )}

      {/* CONTROLES DE CUARTOS */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="font-black text-gray-800 uppercase tracking-wide">
          Período Actual: <span className="text-blue-600">{partido?.periodo_actual || '1Q'}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {['1Q', '2Q', '3Q', '4Q', 'Extra'].map(q => (
            <button 
              key={q}
              onClick={() => cambiarPeriodo(q)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors border ${
                partido?.periodo_actual === q 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* MARCADOR GLOBAL EN VIVO */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-8 shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* LOCAL */}
        <div className="flex flex-col items-center md:w-1/3">
          <span className="text-gray-400 font-bold text-sm tracking-widest mb-2">LOCAL</span>
          <h2 className="text-2xl md:text-3xl font-black uppercase text-center line-clamp-2">{partido?.local?.nombre}</h2>
          
          <div className="flex items-center gap-2 mt-4 bg-gray-800 p-2 rounded-xl border border-gray-700">
            <button onClick={() => ajustarScoreManual('local', 'restar')} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white w-8 h-8 rounded-lg font-black transition-colors">-1</button>
            <span className="text-[10px] font-bold text-gray-400 px-2 uppercase">Ajuste Global</span>
            <button onClick={() => ajustarScoreManual('local', 'sumar')} className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white w-8 h-8 rounded-lg font-black transition-colors">+1</button>
          </div>
        </div>
        
        {/* MARCADOR CENTRAL */}
        <div className="flex flex-col items-center justify-center bg-gray-800 px-8 py-4 rounded-xl border border-gray-700 md:w-1/3">
          <div className="flex items-center gap-6">
            <span className="text-5xl md:text-6xl font-black text-yellow-400">{scoreLocal}</span>
            <span className="text-2xl text-gray-500">-</span>
            <span className="text-5xl md:text-6xl font-black text-yellow-400">{scoreVisitante}</span>
          </div>
          <span className={`mt-3 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${partido?.estado === 'finalizado' && !editandoDespuesDeFinalizar ? 'bg-red-900/50 text-red-400 border-red-800' : 'bg-green-900/50 text-green-400 border-green-800'}`}>
            {partido?.estado === 'finalizado' && !editandoDespuesDeFinalizar ? 'FINALIZADO' : 'EN VIVO / EDITANDO'}
          </span>
        </div>

        {/* VISITANTE */}
        <div className="flex flex-col items-center md:w-1/3">
          <span className="text-gray-400 font-bold text-sm tracking-widest mb-2">VISITANTE</span>
          <h2 className="text-2xl md:text-3xl font-black uppercase text-center line-clamp-2">{partido?.visitante?.nombre}</h2>
          
          <div className="flex items-center gap-2 mt-4 bg-gray-800 p-2 rounded-xl border border-gray-700">
            <button onClick={() => ajustarScoreManual('visitante', 'restar')} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white w-8 h-8 rounded-lg font-black transition-colors">-1</button>
            <span className="text-[10px] font-bold text-gray-400 px-2 uppercase">Ajuste Global</span>
            <button onClick={() => ajustarScoreManual('visitante', 'sumar')} className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white w-8 h-8 rounded-lg font-black transition-colors">+1</button>
          </div>
        </div>
      </div>

      {/* BOTÓN FINALIZAR */}
      {(!partidoBloqueado || editandoDespuesDeFinalizar) && (
        <div className="flex justify-center mb-8">
          <button onClick={finalizarPartido} className="bg-red-600 hover:bg-red-700 text-white font-black px-8 py-3 rounded-xl shadow-md transition-colors uppercase tracking-wide">
            🛑 {partido?.estado === 'finalizado' ? 'Guardar Cambios y Cerrar Edición' : 'Pitar Final del Partido'}
          </button>
        </div>
      )}

      {/* PLANTILLAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-50 rounded-2xl p-4 md:p-6 border border-gray-200 shadow-inner">
          <h3 className="text-xl font-black text-gray-900 uppercase mb-4 text-center border-b border-gray-200 pb-2">Banca Local</h3>
          {rosterLocal.length === 0 ? <p className="text-center text-gray-500 italic py-4">No hay jugadores registrados.</p> : rosterLocal.map((jugador: any) => (
            <JugadorRow key={jugador.id} jugador={jugador} />
          ))}
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 md:p-6 border border-gray-200 shadow-inner">
          <h3 className="text-xl font-black text-gray-900 uppercase mb-4 text-center border-b border-gray-200 pb-2">Banca Visitante</h3>
          {rosterVisitante.length === 0 ? <p className="text-center text-gray-500 italic py-4">No hay jugadores registrados.</p> : rosterVisitante.map((jugador: any) => (
            <JugadorRow key={jugador.id} jugador={jugador} />
          ))}
        </div>
      </div>
    </main>
  );
}
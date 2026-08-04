'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../supabase';

export default function PizarraAnotacion() {
  const { id } = useParams();
  const [partido, setPartido] = useState<any>(null);
  const [jugadoresLocal, setJugadoresLocal] = useState<any[]>([]);
  const [jugadoresVisitante, setJugadoresVisitante] = useState<any[]>([]);
  
  const [marcadorLocal, setMarcadorLocal] = useState(0);
  const [marcadorVisitante, setMarcadorVisitante] = useState(0);
  const [cargando, setCargando] = useState(true);

  // Jugada 1: Cargar el Roster, Partido y Marcador Inicial
  useEffect(() => {
    const fetchDatosPartido = async () => {
      const { data: partidoData } = await supabase
        .from('partidos')
        .select('*, local:equipos!equipo_local_id(nombre), visitante:equipos!equipo_visitante_id(nombre)')
        .eq('id', id)
        .single();

      if (partidoData) {
        setPartido(partidoData);

        const { data: localData } = await supabase
          .from('jugadores')
          .select('*')
          .eq('equipo_id', partidoData.equipo_local_id)
          .order('numero', { ascending: true });
        if (localData) setJugadoresLocal(localData);

        const { data: visitanteData } = await supabase
          .from('jugadores')
          .select('*')
          .eq('equipo_id', partidoData.equipo_visitante_id)
          .order('numero', { ascending: true });
        if (visitanteData) setJugadoresVisitante(visitanteData);

        const { data: statsData } = await supabase
          .from('box_scores')
          .select('equipo_id, puntos_totales')
          .eq('partido_id', id);

        if (statsData) {
          let ptsLocal = 0;
          let ptsVisitante = 0;
          statsData.forEach(stat => {
            if (stat.equipo_id === partidoData.equipo_local_id) ptsLocal += stat.puntos_totales;
            if (stat.equipo_id === partidoData.equipo_visitante_id) ptsVisitante += stat.puntos_totales;
          });
          setMarcadorLocal(ptsLocal);
          setMarcadorVisitante(ptsVisitante);
        }
      }
      setCargando(false);
    };

    if (id) fetchDatosPartido();
  }, [id]);

  // 🏀 JUGADA AVANZADA: Sumar o Restar estadísticas dinámicamente
  // 'valor' será 1 (para sumar) o -1 (para corregir/restar)
  const anotarEstadistica = async (jugadorId: string, equipoId: string, accion: string, valor: number) => {
    if (partido.estado === 'finalizado') {
      alert("⚠️ El partido ya terminó. No puedes modificar las estadísticas.");
      return;
    }

    // 1. Consultar la base de datos para ver las estadísticas actuales del jugador
    const { data: currentBox } = await supabase
      .from('box_scores')
      .select('*')
      .eq('partido_id', id)
      .eq('jugador_id', jugadorId)
      .single();

    let newData: any = { partido_id: id, jugador_id: jugadorId, equipo_id: equipoId };

    // Función táctica para no permitir que los números bajen de cero
    const safeAdd = (currentValue: number | undefined, addValue: number) => Math.max(0, (currentValue || 0) + addValue);

    // 2. Asignar la estadística y calcular diferencias para el marcador global
    if (accion === 'pt1') {
      const nuevoAnotado = safeAdd(currentBox?.tiros_libres_anotados, valor);
      const diff = nuevoAnotado - (currentBox?.tiros_libres_anotados || 0); // Cuántos puntos reales se sumaron/restaron
      newData.tiros_libres_anotados = nuevoAnotado;
      newData.tiros_libres_intentados = safeAdd(currentBox?.tiros_libres_intentados, valor);
      newData.puntos_totales = safeAdd(currentBox?.puntos_totales, diff * 1);

      if (diff !== 0) {
        if (equipoId === partido.equipo_local_id) setMarcadorLocal(prev => Math.max(0, prev + diff));
        if (equipoId === partido.equipo_visitante_id) setMarcadorVisitante(prev => Math.max(0, prev + diff));
      }
    } else if (accion === 'pt2') {
      const nuevoAnotado = safeAdd(currentBox?.tiros_2pt_anotados, valor);
      const diff = nuevoAnotado - (currentBox?.tiros_2pt_anotados || 0);
      newData.tiros_2pt_anotados = nuevoAnotado;
      newData.tiros_2pt_intentados = safeAdd(currentBox?.tiros_2pt_intentados, valor);
      newData.puntos_totales = safeAdd(currentBox?.puntos_totales, diff * 2);

      if (diff !== 0) {
        if (equipoId === partido.equipo_local_id) setMarcadorLocal(prev => Math.max(0, prev + (diff * 2)));
        if (equipoId === partido.equipo_visitante_id) setMarcadorVisitante(prev => Math.max(0, prev + (diff * 2)));
      }
    } else if (accion === 'pt3') {
      const nuevoAnotado = safeAdd(currentBox?.tiros_3pt_anotados, valor);
      const diff = nuevoAnotado - (currentBox?.tiros_3pt_anotados || 0);
      newData.tiros_3pt_anotados = nuevoAnotado;
      newData.tiros_3pt_intentados = safeAdd(currentBox?.tiros_3pt_intentados, valor);
      newData.puntos_totales = safeAdd(currentBox?.puntos_totales, diff * 3);

      if (diff !== 0) {
        if (equipoId === partido.equipo_local_id) setMarcadorLocal(prev => Math.max(0, prev + (diff * 3)));
        if (equipoId === partido.equipo_visitante_id) setMarcadorVisitante(prev => Math.max(0, prev + (diff * 3)));
      }
    } else if (accion === 'falta') {
      newData.faltas_personales = safeAdd(currentBox?.faltas_personales, valor);
    } else if (accion === 'minuto') {
      newData.minutos_jugados = safeAdd(currentBox?.minutos_jugados, valor);
    }

    // 3. Guardar la acción en Supabase
    if (currentBox) {
      await supabase.from('box_scores').update(newData).eq('id', currentBox.id);
    } else {
      await supabase.from('box_scores').insert([newData]);
    }
  };

  const finalizarPartido = async () => {
    const confirmar = window.confirm("🚨 ¿Estás seguro de pitar el final del encuentro? Esto cerrará las estadísticas y actualizará la Tabla de Posiciones de la liga.");
    if (!confirmar) return;

    const { error } = await supabase
      .from('partidos')
      .update({ estado: 'finalizado' })
      .eq('id', id);

    if (error) {
      alert(`❌ Error en el pitazo final: ${error.message}`);
    } else {
      alert("✅ ¡Partido Finalizado exitosamente! Los resultados ya están en la Tabla de Posiciones.");
      setPartido({ ...partido, estado: 'finalizado' });
    }
  };

  if (cargando) return <div className="text-center py-20 text-2xl font-bold text-gray-500">Calentando la pista...</div>;
  if (!partido) return <div className="text-center py-20 text-2xl font-bold text-red-600">❌ Error: Partido no encontrado.</div>;

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Marcador Superior Dinámico */}
      <div className="bg-gray-900 text-white rounded-xl p-6 mb-8 text-center shadow-lg">
        <p className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-2">
          {partido.fase_torneo} • {partido.categoria} • {partido.lugar}
        </p>
        <div className="flex justify-between items-center px-4 md:px-16">
          <div className="text-2xl md:text-4xl font-black w-1/3 truncate">{partido.local?.nombre}</div>
          <div className="text-5xl md:text-6xl font-black text-yellow-400 w-1/3">
            {marcadorLocal} - {marcadorVisitante}
          </div>
          <div className="text-2xl md:text-4xl font-black w-1/3 truncate">{partido.visitante?.nombre}</div>
        </div>
        
        {/* Controles de Estado del Partido */}
        <div className="mt-6 flex flex-col items-center justify-center gap-4 border-t border-gray-700 pt-6">
          <p className="font-semibold text-gray-300">
            ESTADO: <span className={partido.estado === 'finalizado' ? "text-red-400 uppercase font-black" : "text-green-400 uppercase"}>{partido.estado}</span>
          </p>
          
          {partido.estado !== 'finalizado' && (
            <button 
              onClick={finalizarPartido}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-colors shadow-md border-2 border-red-500"
            >
              🛑 Pitar Final del Partido
            </button>
          )}
        </div>
      </div>

      {/* Roster y Controles por Equipo */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Panel Equipo Local */}
        <div className="bg-white border-2 border-blue-100 rounded-xl p-6 shadow-sm">
          <h2 className="text-2xl font-black text-gray-900 mb-6 border-b-2 border-gray-100 pb-2">
            Banca Local: <span className="text-blue-600">{partido.local?.nombre}</span>
          </h2>
          <div className="flex flex-col gap-4">
            {jugadoresLocal.length === 0 ? (
              <p className="text-gray-500 italic">No hay jugadores registrados en esta plantilla.</p>
            ) : (
              jugadoresLocal.map((jugador) => (
                <div key={jugador.id} className="flex flex-col bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm transition-colors hover:border-blue-300">
                  <div className="font-bold text-gray-800 text-lg mb-3 border-b border-gray-200 pb-2">
                    <span className="text-blue-600 mr-2">#{jugador.numero}</span> {jugador.nombre}
                  </div>
                  
                  {/* Cuadrícula de 5 controles (+ y -) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    
                    {/* Control Minutos */}
                    <div className="flex flex-col items-center bg-white border border-gray-200 rounded p-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase mb-1">Minutos</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'minuto', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'minuto', 1)} disabled={partido.estado === 'finalizado'} className="bg-green-50 hover:bg-green-200 text-green-600 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+</button>
                      </div>
                    </div>

                    {/* Control Faltas */}
                    <div className="flex flex-col items-center bg-white border border-gray-200 rounded p-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase mb-1">Faltas</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'falta', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'falta', 1)} disabled={partido.estado === 'finalizado'} className="bg-orange-50 hover:bg-orange-200 text-orange-600 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+</button>
                      </div>
                    </div>

                    {/* Control 1PT */}
                    <div className="flex flex-col items-center bg-white border border-blue-200 rounded p-2">
                      <span className="text-[10px] font-black text-blue-700 uppercase mb-1">T. Libres</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'pt1', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'pt1', 1)} disabled={partido.estado === 'finalizado'} className="bg-blue-100 hover:bg-blue-300 text-blue-700 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+1</button>
                      </div>
                    </div>

                    {/* Control 2PT */}
                    <div className="flex flex-col items-center bg-white border border-blue-200 rounded p-2">
                      <span className="text-[10px] font-black text-blue-700 uppercase mb-1">2 Puntos</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'pt2', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'pt2', 1)} disabled={partido.estado === 'finalizado'} className="bg-blue-100 hover:bg-blue-300 text-blue-700 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+2</button>
                      </div>
                    </div>

                    {/* Control 3PT */}
                    <div className="flex flex-col items-center bg-white border border-blue-200 rounded p-2">
                      <span className="text-[10px] font-black text-blue-700 uppercase mb-1">3 Puntos</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'pt3', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 'pt3', 1)} disabled={partido.estado === 'finalizado'} className="bg-blue-100 hover:bg-blue-300 text-blue-700 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+3</button>
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel Equipo Visitante */}
        <div className="bg-white border-2 border-red-100 rounded-xl p-6 shadow-sm">
          <h2 className="text-2xl font-black text-gray-900 mb-6 border-b-2 border-gray-100 pb-2">
            Banca Visitante: <span className="text-red-600">{partido.visitante?.nombre}</span>
          </h2>
          <div className="flex flex-col gap-4">
            {jugadoresVisitante.length === 0 ? (
              <p className="text-gray-500 italic">No hay jugadores registrados en esta plantilla.</p>
            ) : (
              jugadoresVisitante.map((jugador) => (
                <div key={jugador.id} className="flex flex-col bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm transition-colors hover:border-red-300">
                  <div className="font-bold text-gray-800 text-lg mb-3 border-b border-gray-200 pb-2">
                    <span className="text-red-600 mr-2">#{jugador.numero}</span> {jugador.nombre}
                  </div>
                  
                  {/* Cuadrícula de 5 controles (+ y -) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    
                    {/* Control Minutos */}
                    <div className="flex flex-col items-center bg-white border border-gray-200 rounded p-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase mb-1">Minutos</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'minuto', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'minuto', 1)} disabled={partido.estado === 'finalizado'} className="bg-green-50 hover:bg-green-200 text-green-600 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+</button>
                      </div>
                    </div>

                    {/* Control Faltas */}
                    <div className="flex flex-col items-center bg-white border border-gray-200 rounded p-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase mb-1">Faltas</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'falta', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'falta', 1)} disabled={partido.estado === 'finalizado'} className="bg-orange-50 hover:bg-orange-200 text-orange-600 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+</button>
                      </div>
                    </div>

                    {/* Control 1PT */}
                    <div className="flex flex-col items-center bg-white border border-red-200 rounded p-2">
                      <span className="text-[10px] font-black text-red-700 uppercase mb-1">T. Libres</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'pt1', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'pt1', 1)} disabled={partido.estado === 'finalizado'} className="bg-red-100 hover:bg-red-300 text-red-700 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+1</button>
                      </div>
                    </div>

                    {/* Control 2PT */}
                    <div className="flex flex-col items-center bg-white border border-red-200 rounded p-2">
                      <span className="text-[10px] font-black text-red-700 uppercase mb-1">2 Puntos</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'pt2', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'pt2', 1)} disabled={partido.estado === 'finalizado'} className="bg-red-100 hover:bg-red-300 text-red-700 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+2</button>
                      </div>
                    </div>

                    {/* Control 3PT */}
                    <div className="flex flex-col items-center bg-white border border-red-200 rounded p-2">
                      <span className="text-[10px] font-black text-red-700 uppercase mb-1">3 Puntos</span>
                      <div className="flex w-full justify-between gap-1">
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'pt3', -1)} disabled={partido.estado === 'finalizado'} className="bg-red-50 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded disabled:opacity-50">-</button>
                        <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 'pt3', 1)} disabled={partido.estado === 'finalizado'} className="bg-red-100 hover:bg-red-300 text-red-700 font-bold px-2 py-1 rounded disabled:opacity-50 w-full">+3</button>
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
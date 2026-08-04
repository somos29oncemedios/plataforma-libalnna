'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../supabase';

export default function PizarraAnotacion() {
  const { id } = useParams();
  const [partido, setPartido] = useState<any>(null);
  const [jugadoresLocal, setJugadoresLocal] = useState<any[]>([]);
  const [jugadoresVisitante, setJugadoresVisitante] = useState<any[]>([]);
  
  // 🏀 Nuevos estados para el Marcador Global
  const [marcadorLocal, setMarcadorLocal] = useState(0);
  const [marcadorVisitante, setMarcadorVisitante] = useState(0);
  const [cargando, setCargando] = useState(true);

  // Jugada 1: Cargar el Roster, Partido y Marcador Inicial
  useEffect(() => {
    const fetchDatosPartido = async () => {
      // Buscar detalles del encuentro
      const { data: partidoData } = await supabase
        .from('partidos')
        .select('*, local:equipos!equipo_local_id(nombre), visitante:equipos!equipo_visitante_id(nombre)')
        .eq('id', id)
        .single();

      if (partidoData) {
        setPartido(partidoData);

        // Buscar jugadores Local
        const { data: localData } = await supabase
          .from('jugadores')
          .select('*')
          .eq('equipo_id', partidoData.equipo_local_id)
          .order('numero', { ascending: true });
        if (localData) setJugadoresLocal(localData);

        // Buscar jugadores Visitante
        const { data: visitanteData } = await supabase
          .from('jugadores')
          .select('*')
          .eq('equipo_id', partidoData.equipo_visitante_id)
          .order('numero', { ascending: true });
        if (visitanteData) setJugadoresVisitante(visitanteData);

        // Buscar Estadísticas Previas para armar el marcador actual
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

  // Jugada 2: Registrar estadísticas en vivo en Supabase
  const anotarEstadistica = async (jugadorId: string, equipoId: string, tipoPunto: number) => {
    
    // 1. Actualizar Marcador Visual Inmediato
    if (tipoPunto > 0) {
      if (equipoId === partido.equipo_local_id) setMarcadorLocal(prev => prev + tipoPunto);
      if (equipoId === partido.equipo_visitante_id) setMarcadorVisitante(prev => prev + tipoPunto);
    }

    // 2. Buscar si el jugador ya tiene estadísticas en este partido
    const { data: currentBox } = await supabase
      .from('box_scores')
      .select('*')
      .eq('partido_id', id)
      .eq('jugador_id', jugadorId)
      .single();

    // 3. Preparar los nuevos datos a enviar
    let newData: any = {
      partido_id: id,
      jugador_id: jugadorId,
      equipo_id: equipoId,
    };

    if (tipoPunto === 1) {
      newData.puntos_totales = (currentBox?.puntos_totales || 0) + 1;
      newData.tiros_libres_anotados = (currentBox?.tiros_libres_anotados || 0) + 1;
      newData.tiros_libres_intentados = (currentBox?.tiros_libres_intentados || 0) + 1;
    } else if (tipoPunto === 2) {
      newData.puntos_totales = (currentBox?.puntos_totales || 0) + 2;
      newData.tiros_2pt_anotados = (currentBox?.tiros_2pt_anotados || 0) + 1;
      newData.tiros_2pt_intentados = (currentBox?.tiros_2pt_intentados || 0) + 1;
    } else if (tipoPunto === 3) {
      newData.puntos_totales = (currentBox?.puntos_totales || 0) + 3;
      newData.tiros_3pt_anotados = (currentBox?.tiros_3pt_anotados || 0) + 1;
      newData.tiros_3pt_intentados = (currentBox?.tiros_3pt_intentados || 0) + 1;
    } else if (tipoPunto === 0) {
      newData.faltas_personales = (currentBox?.faltas_personales || 0) + 1;
    }

    // 4. Guardar en Supabase (Insertar si es nuevo, Actualizar si ya existe)
    if (currentBox) {
      await supabase.from('box_scores').update(newData).eq('id', currentBox.id);
    } else {
      await supabase.from('box_scores').insert([newData]);
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
        <p className="mt-4 font-semibold text-gray-300">ESTADO: <span className="text-green-400 uppercase">{partido.estado}</span></p>
      </div>

      {/* Roster y Controles por Equipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
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
                <div key={jugador.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="font-bold text-gray-800 text-lg">
                    <span className="text-blue-600 mr-2">#{jugador.numero}</span> {jugador.nombre}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 1)} className="bg-gray-200 hover:bg-blue-600 hover:text-white text-gray-800 font-black px-3 py-1 rounded transition-colors">+1</button>
                    <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 2)} className="bg-gray-200 hover:bg-blue-600 hover:text-white text-gray-800 font-black px-3 py-1 rounded transition-colors">+2</button>
                    <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 3)} className="bg-gray-200 hover:bg-blue-600 hover:text-white text-gray-800 font-black px-3 py-1 rounded transition-colors">+3</button>
                    <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_local_id, 0)} className="bg-red-100 hover:bg-red-600 hover:text-white text-red-700 font-black px-3 py-1 rounded transition-colors">F</button>
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
                <div key={jugador.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-red-300 transition-colors">
                  <div className="font-bold text-gray-800 text-lg">
                    <span className="text-red-600 mr-2">#{jugador.numero}</span> {jugador.nombre}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 1)} className="bg-gray-200 hover:bg-red-600 hover:text-white text-gray-800 font-black px-3 py-1 rounded transition-colors">+1</button>
                    <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 2)} className="bg-gray-200 hover:bg-red-600 hover:text-white text-gray-800 font-black px-3 py-1 rounded transition-colors">+2</button>
                    <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 3)} className="bg-gray-200 hover:bg-red-600 hover:text-white text-gray-800 font-black px-3 py-1 rounded transition-colors">+3</button>
                    <button onClick={() => anotarEstadistica(jugador.id, partido.equipo_visitante_id, 0)} className="bg-red-100 hover:bg-red-600 hover:text-white text-red-700 font-black px-3 py-1 rounded transition-colors">F</button>
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
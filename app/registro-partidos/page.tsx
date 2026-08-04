'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function RegistroPartidos() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [localId, setLocalId] = useState('');
  const [visitanteId, setVisitanteId] = useState('');
  const [fecha, setFecha] = useState('');
  const [fase, setFase] = useState('Ronda Regular');
  const [lugar, setLugar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Cargar los equipos en el calentamiento
  useEffect(() => {
    const fetchEquipos = async () => {
      const { data } = await supabase
        .from('equipos')
        .select('*')
        .order('nombre', { ascending: true });
      if (data) setEquipos(data);
    };
    fetchEquipos();
  }, []);

  const programarPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('Programando el salto inicial...');

    if (localId === visitanteId) {
      setMensaje('❌ Falta técnica: Un equipo no puede jugar contra sí mismo.');
      return;
    }

    // 🏀 JUGADA DE ARMADOR: Separar la fecha y la hora para Supabase
    // El input 'datetime-local' entrega un formato así: "2024-10-25T18:30"
    // Lo dividimos por la letra "T" para tener ambos datos por separado.
    const [fechaSeparada, horaSeparada] = fecha.split('T');

    const { error } = await supabase
      .from('partidos')
      .insert([
        { 
          equipo_local_id: localId, 
          equipo_visitante_id: visitanteId, 
          fecha: fechaSeparada, // Entregamos solo el día (ej. 2024-10-25)
          hora: horaSeparada,   // Entregamos solo la hora (ej. 18:30)
          fase_torneo: fase,
          lugar: lugar,
          categoria: categoria,
          estado: 'programado',
          periodo_actual: '1Q'
        }
      ]);

    if (error) {
      setMensaje(`❌ Error en la pizarra: ${error.message}`);
    } else {
      setMensaje('✅ ¡Partido programado con éxito en el calendario!');
      setLocalId('');
      setVisitanteId('');
      setFecha('');
      setLugar('');
      setFase('Ronda Regular');
      setCategoria('');
    }
  };

  return (
    <main className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="text-4xl font-black text-center text-gray-900 mb-8 tracking-tight">
        Programar <span className="text-blue-600">Partido</span>
      </h1>

      <div className="bg-white border border-gray-200 shadow-md rounded-xl p-8">
        <form onSubmit={programarPartido} className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Equipo Local *</label>
              <select 
                value={localId} onChange={(e) => setLocalId(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required
              >
                <option value="">-- Selecciona al Local --</option>
                {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Equipo Visitante *</label>
              <select 
                value={visitanteId} onChange={(e) => setVisitanteId(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required
              >
                <option value="">-- Selecciona al Visitante --</option>
                {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Categoría *</label>
              <select 
                value={categoria} onChange={(e) => setCategoria(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required
              >
                <option value="">-- Selecciona la Categoría --</option>
                <option value="U8">U8</option>
                <option value="U10">U10</option>
                <option value="U12">U12</option>
                <option value="U14">U14</option>
                <option value="U16 Femenino">U16 Femenino</option>
                <option value="U16 Masculino">U16 Masculino</option>
                <option value="U18">U18</option>
                <option value="U20">U20</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Fase del Torneo *</label>
              <select 
                value={fase} onChange={(e) => setFase(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required
              >
                <option value="Ronda Regular">Ronda Regular</option>
                <option value="16vos de Final">16vos de Final</option>
                <option value="Octavos de Final">Octavos de Final</option>
                <option value="Cuartos de Final">Cuartos de Final</option>
                <option value="Semifinal">Semifinal</option>
                <option value="Final">Final</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Fecha y Hora *</label>
              <input 
                type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Cancha / Gimnasio *</label>
              <input 
                type="text" value={lugar} onChange={(e) => setLugar(e.target.value)}
                placeholder="Ej. Gimnasio Los Horcones"
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required 
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-4">
            Añadir al Calendario
          </button>
        </form>

        {mensaje && (
          <div className="mt-6 text-center font-semibold text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-200">
            {mensaje}
          </div>
        )}
      </div>
    </main>
  );
}
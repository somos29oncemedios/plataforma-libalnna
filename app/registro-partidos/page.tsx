'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function RegistroPartidos() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]); // Lista de partidos

  // Estados del formulario
  const [localId, setLocalId] = useState('');
  const [visitanteId, setVisitanteId] = useState('');
  const [fechaInput, setFechaInput] = useState(''); 
  const [fase, setFase] = useState('Ronda Regular');
  const [lugar, setLugar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Estado para saber si estamos en "Modo Edición"
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Cargar los equipos y los partidos programados
  const cargarDatos = async () => {
    // 1. Buscar Equipos
    const { data: eqData } = await supabase
      .from('equipos')
      .select('*')
      .order('nombre', { ascending: true });
    if (eqData) setEquipos(eqData);

    // 2. Buscar Partidos
    const { data: partData } = await supabase
      .from('partidos')
      .select('*, local:equipos!equipo_local_id(nombre), visitante:equipos!equipo_visitante_id(nombre)')
      .order('fecha', { ascending: false });
    if (partData) setPartidos(partData);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Función combinada: Crear Nuevo o Actualizar Existente
  const guardarPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('Procesando la jugada en la pizarra...');

    if (localId === visitanteId) {
      setMensaje('❌ Falta técnica: Un equipo no puede jugar contra sí mismo.');
      return;
    }

    // Separar fecha y hora para la base de datos
    const [fechaSeparada, horaSeparada] = fechaInput.split('T');

    const datosPartido = { 
      equipo_local_id: localId, 
      equipo_visitante_id: visitanteId, 
      fecha: fechaSeparada, 
      hora: horaSeparada,   
      fase_torneo: fase,
      lugar: lugar,
      categoria: categoria
    };

    if (editandoId) {
      // 🏀 JUGADA DE EDICIÓN (UPDATE)
      const { error } = await supabase
        .from('partidos')
        .update(datosPartido)
        .eq('id', editandoId);

      if (error) {
        setMensaje(`❌ Error al actualizar: ${error.message}`);
      } else {
        setMensaje('✅ ¡Partido actualizado con éxito en el calendario!');
        limpiarFormulario();
        cargarDatos(); // Refrescar la lista
      }
    } else {
      // 🏀 JUGADA DE CREACIÓN (INSERT)
      const { error } = await supabase
        .from('partidos')
        .insert([{ 
          ...datosPartido,
          estado: 'programado',
          periodo_actual: '1Q'
        }]);

      if (error) {
        setMensaje(`❌ Error en la pizarra: ${error.message}`);
      } else {
        setMensaje('✅ ¡Partido programado con éxito!');
        limpiarFormulario();
        cargarDatos(); // Refrescar la lista
      }
    }
  };

  // Función para subir los datos del partido al formulario
  const editarPartido = (partido: any) => {
    setLocalId(partido.equipo_local_id);
    setVisitanteId(partido.equipo_visitante_id);
    setCategoria(partido.categoria);
    setFase(partido.fase_torneo);
    setLugar(partido.lugar);
    // Unir la fecha y la hora para que el calendario del navegador lo entienda
    setFechaInput(`${partido.fecha}T${partido.hora}`);
    
    setEditandoId(partido.id);
    setMensaje('✏️ Modo edición activado. Corrige los datos y haz clic en "Actualizar Partido".');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Subir la pantalla suavemente
  };

  // 🛑 NUEVA JUGADA: Función para Eliminar un Partido
  const eliminarPartido = async (id: string) => {
    const confirmar = window.confirm("🚨 ¿Estás seguro de que deseas eliminar este partido del calendario? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    const { error } = await supabase
      .from('partidos')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`❌ Error al eliminar el partido: ${error.message}`);
    } else {
      alert("✅ ¡Partido eliminado correctamente del calendario!");
      cargarDatos(); // Refrescar la lista automáticamente
      
      // Si estábamos editando el partido que acabamos de borrar, limpiamos el formulario
      if (editandoId === id) {
        limpiarFormulario();
      }
    }
  };

  const limpiarFormulario = () => {
    setLocalId('');
    setVisitanteId('');
    setFechaInput('');
    setLugar('');
    setFase('Ronda Regular');
    setCategoria('');
    setEditandoId(null);
    if (mensaje.includes('Modo edición')) setMensaje('');
  };

  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-black text-center text-gray-900 mb-8 tracking-tight">
        Administrar <span className="text-blue-600">Calendario</span>
      </h1>

      {/* FORMULARIO DE REGISTRO / EDICIÓN */}
      <div className={`bg-white border-2 shadow-md rounded-xl p-8 mb-12 transition-colors ${editandoId ? 'border-yellow-400' : 'border-gray-200'}`}>
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
          {editandoId ? '✏️ Modificar Partido Existente' : '📅 Programar Nuevo Partido'}
        </h2>
        
        <form onSubmit={guardarPartido} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Equipo Local *</label>
              <select value={localId} onChange={(e) => setLocalId(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">-- Selecciona al Local --</option>
                {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Equipo Visitante *</label>
              <select value={visitanteId} onChange={(e) => setVisitanteId(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">-- Selecciona al Visitante --</option>
                {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Categoría *</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
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
              <select value={fase} onChange={(e) => setFase(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
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
              <input type="datetime-local" value={fechaInput} onChange={(e) => setFechaInput(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Cancha / Gimnasio *</label>
              <input type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Ej. Gimnasio Los Horcones" className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <button type="submit" className={`w-full text-white font-bold py-3 rounded-lg transition-colors ${editandoId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editandoId ? 'Actualizar Partido' : 'Añadir al Calendario'}
            </button>
            {editandoId && (
              <button type="button" onClick={limpiarFormulario} className="w-1/3 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors">
                Cancelar
              </button>
            )}
          </div>
        </form>

        {mensaje && (
          <div className={`mt-6 text-center font-semibold p-4 rounded-lg border ${mensaje.includes('❌') ? 'bg-red-50 text-red-800 border-red-200' : mensaje.includes('✏️') ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
            {mensaje}
          </div>
        )}
      </div>

      {/* LISTA DE PARTIDOS PARA EDITAR Y ELIMINAR */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
          Partidos Programados
        </h2>
        
        {partidos.length === 0 ? (
          <p className="text-gray-500 italic text-center py-6">No hay partidos registrados en la base de datos.</p>
        ) : (
          <div className="grid gap-4">
            {partidos.map(partido => (
              <div key={partido.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                    {partido.categoria} • {partido.fase_torneo}
                  </p>
                  <p className="text-lg font-black text-gray-900 mt-1">
                    {partido.local?.nombre || 'Local'} VS {partido.visitante?.nombre || 'Visitante'}
                  </p>
                  <p className="text-sm text-gray-600 font-medium mt-1">
                    📅 {partido.fecha} | ⏰ {partido.hora} | 📍 {partido.lugar}
                  </p>
                  <p className="text-xs mt-1 font-bold">
                    Estado: <span className={partido.estado === 'finalizado' ? 'text-red-500' : 'text-green-500'}>{partido.estado.toUpperCase()}</span>
                  </p>
                </div>
                
                {/* Botones de Acción */}
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => editarPartido(partido)} 
                    className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-2 rounded-md transition-colors w-full md:w-auto"
                  >
                    Modificar
                  </button>
                  <button 
                    onClick={() => eliminarPartido(partido.id)} 
                    className="bg-red-100 hover:bg-red-600 text-red-700 hover:text-white font-bold px-6 py-2 rounded-md transition-colors w-full md:w-auto"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
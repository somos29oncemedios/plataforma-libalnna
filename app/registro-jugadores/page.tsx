'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const CATEGORIAS_DISPONIBLES = [
  'U8', 'U10', 'U12', 'U14', 
  'U16 Femenino', 'U16 Masculino', 'U18', 'U20'
];

export default function RegistroJugadores() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]); // Lista de atletas
  
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');

  // Estado para saber si estamos en "Modo Edición"
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const cargarDatos = async () => {
    // Buscar Equipos para el select
    const { data: eqData } = await supabase.from('equipos').select('*').order('nombre', { ascending: true });
    if (eqData) setEquipos(eqData);

    // Buscar Jugadores para la lista inferior
    const { data: jugData } = await supabase
      .from('jugadores')
      .select('*, equipo:equipos!equipo_id(nombre)')
      .order('nombre', { ascending: true });
    if (jugData) setJugadores(jugData);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const toggleCategoria = (categoria: string) => {
    setCategoriasSeleccionadas((prev) => 
      prev.includes(categoria) 
        ? prev.filter((c) => c !== categoria) 
        : [...prev, categoria]
    );
  };

  const guardarJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('Procesando la jugada...');

    if (!equipoId) {
      setMensaje('❌ Falta técnica: Debes seleccionar un equipo.');
      return;
    }

    if (categoriasSeleccionadas.length === 0) {
      setMensaje('❌ Falta técnica: El jugador debe pertenecer al menos a una categoría.');
      return;
    }

    const datosJugador = { 
      nombre, 
      numero, 
      equipo_id: equipoId, 
      foto_url: fotoUrl,
      categorias: categoriasSeleccionadas 
    };

    if (editandoId) {
      // 🏀 UPDATE
      const { error } = await supabase.from('jugadores').update(datosJugador).eq('id', editandoId);
      if (error) setMensaje(`❌ Error al actualizar: ${error.message}`);
      else {
        setMensaje('✅ ¡Atleta actualizado con éxito!');
        limpiarFormulario();
        cargarDatos();
      }
    } else {
      // 🏀 INSERT
      const { error } = await supabase.from('jugadores').insert([datosJugador]);
      if (error) setMensaje(`❌ Error en el fichaje: ${error.message}`);
      else {
        setMensaje('✅ ¡Jugador fichado con éxito!');
        limpiarFormulario();
        cargarDatos();
      }
    }
  };

  const editarJugador = (jugador: any) => {
    setNombre(jugador.nombre);
    setNumero(jugador.numero);
    setEquipoId(jugador.equipo_id);
    setFotoUrl(jugador.foto_url || '');
    setCategoriasSeleccionadas(jugador.categorias || []);
    setEditandoId(jugador.id);
    setMensaje('✏️ Modo edición activado. Corrige los datos y haz clic en "Actualizar Atleta".');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarJugador = async (id: string) => {
    const confirmar = window.confirm("🚨 ¿Estás seguro de que deseas eliminar a este jugador de la liga? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    const { error } = await supabase.from('jugadores').delete().eq('id', id);
    if (error) {
      alert(`❌ Error al eliminar: ${error.message}`);
    } else {
      alert("✅ ¡Jugador eliminado correctamente!");
      cargarDatos();
      if (editandoId === id) limpiarFormulario();
    }
  };

  const limpiarFormulario = () => {
    setNombre('');
    setNumero('');
    setEquipoId('');
    setFotoUrl('');
    setCategoriasSeleccionadas([]);
    setEditandoId(null);
    if (mensaje.includes('Modo edición')) setMensaje('');
  };

  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-black text-center text-gray-900 mb-8 tracking-tight">
        Administrar <span className="text-blue-600">Atletas</span>
      </h1>

      {/* FORMULARIO DE REGISTRO / EDICIÓN */}
      <div className={`bg-white border-2 shadow-md rounded-xl p-8 mb-12 transition-colors ${editandoId ? 'border-yellow-400' : 'border-gray-200'}`}>
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
          {editandoId ? '✏️ Modificar Atleta Existente' : '🏀 Fichar Nuevo Atleta'}
        </h2>
        
        <form onSubmit={guardarJugador} className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Equipo Destino *</label>
            <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">-- Selecciona un Equipo --</option>
              {equipos.map(equipo => (
                <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo *</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Michael Jordan" className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Número de Camiseta *</label>
              <input type="number" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej. 23" className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-3">Categorías del Atleta (Puedes marcar varias) *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIAS_DISPONIBLES.map((cat) => (
                <label key={cat} className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={categoriasSeleccionadas.includes(cat)} onChange={() => toggleCategoria(cat)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Enlace de Fotografía (Opcional)</label>
            <input type="url" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} placeholder="https://..." className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-4 mt-4">
            <button type="submit" className={`w-full text-white font-bold py-3 rounded-lg transition-colors ${editandoId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editandoId ? 'Actualizar Atleta' : 'Inscribir Jugador'}
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

      {/* LISTA DE JUGADORES PARA EDITAR Y ELIMINAR */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Atletas Fichados</h2>
        
        {jugadores.length === 0 ? (
          <p className="text-gray-500 italic text-center py-6">No hay jugadores registrados en la base de datos.</p>
        ) : (
          <div className="grid gap-4">
            {jugadores.map(jugador => (
              <div key={jugador.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-gray-300">
                    {jugador.foto_url ? (
                      <img src={jugador.foto_url} alt={jugador.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 font-black">#{jugador.numero}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900">
                      {jugador.nombre} <span className="text-sm font-bold text-gray-500 ml-2">#{jugador.numero}</span>
                    </p>
                    <p className="text-sm font-bold text-blue-600">{jugador.equipo?.nombre || 'Sin Equipo'}</p>
                    <p className="text-xs font-semibold text-gray-500 mt-1">Cats: {jugador.categorias?.join(', ')}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => editarJugador(jugador)} className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-2 rounded-md transition-colors w-full md:w-auto">Modificar</button>
                  <button onClick={() => eliminarJugador(jugador.id)} className="bg-red-100 hover:bg-red-600 text-red-700 hover:text-white font-bold px-6 py-2 rounded-md transition-colors w-full md:w-auto">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
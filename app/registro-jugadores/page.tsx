'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// Lista de categorías oficiales de Libalnna
const CATEGORIAS_DISPONIBLES = [
  'U8', 'U10', 'U12', 'U14', 
  'U16 Femenino', 'U16 Masculino', 'U18', 'U20'
];

export default function RegistroJugadores() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');

  // Cargar los equipos en el calentamiento
  useEffect(() => {
    const fetchEquipos = async () => {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (data) setEquipos(data);
    };
    fetchEquipos();
  }, []);

  // Manejar las casillas de categorías
  const toggleCategoria = (categoria: string) => {
    setCategoriasSeleccionadas((prev) => 
      prev.includes(categoria) 
        ? prev.filter((c) => c !== categoria) 
        : [...prev, categoria]
    );
  };

  // Función para enviar el jugador a la base de datos
  const registrarJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('Fichando jugador...');

    if (!equipoId) {
      setMensaje('❌ Falta técnica: Debes seleccionar un equipo.');
      return;
    }

    if (categoriasSeleccionadas.length === 0) {
      setMensaje('❌ Falta técnica: El jugador debe pertenecer al menos a una categoría.');
      return;
    }

    const { error } = await supabase
      .from('jugadores')
      .insert([
        { 
          nombre, 
          numero, 
          equipo_id: equipoId, 
          foto_url: fotoUrl,
          categorias: categoriasSeleccionadas // Enviamos la lista de categorías
        }
      ]);

    if (error) {
      setMensaje(`❌ Error en el fichaje: ${error.message}`);
    } else {
      setMensaje('✅ ¡Jugador fichado con éxito y listo para jugar!');
      // Limpiamos la pizarra para el siguiente registro
      setNombre('');
      setNumero('');
      setFotoUrl('');
      setCategoriasSeleccionadas([]);
    }
  };

  return (
    <main className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="text-4xl font-black text-center text-gray-900 mb-8 tracking-tight">
        Fichaje de <span className="text-blue-600">Atletas</span>
      </h1>

      <div className="bg-white border border-gray-200 shadow-md rounded-xl p-8">
        <form onSubmit={registrarJugador} className="flex flex-col gap-6">
          
          {/* Selección de Equipo */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Equipo Destino *</label>
            <select 
              value={equipoId}
              onChange={(e) => setEquipoId(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Selecciona un Equipo --</option>
              {equipos.map(equipo => (
                <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre del Jugador */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo *</label>
              <input 
                type="text" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Michael Jordan"
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
              />
            </div>

            {/* Número de Camiseta */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Número de Camiseta *</label>
              <input 
                type="number" 
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ej. 23"
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
              />
            </div>
          </div>

          {/* Categorías (Múltiple Selección) */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Categorías del Atleta (Puedes marcar varias) *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIAS_DISPONIBLES.map((cat) => (
                <label key={cat} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoriasSeleccionadas.includes(cat)}
                    onChange={() => toggleCategoria(cat)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* URL de la Foto (Opcional) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Enlace de Fotografía (Opcional)</label>
            <input 
              type="url" 
              value={fotoUrl}
              onChange={(e) => setFotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botón de Acción */}
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-4"
          >
            Inscribir Jugador
          </button>
        </form>

        {/* Marcador de Mensajes */}
        {mensaje && (
          <div className="mt-6 text-center font-semibold text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-200">
            {mensaje}
          </div>
        )}
      </div>
    </main>
  );
}
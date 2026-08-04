'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const CATEGORIAS_DISPONIBLES = ['U8', 'U10', 'U12', 'U14', 'U16 Masculino', 'U16 Femenino', 'U18', 'U20'];

export default function RegistroEquipos() {
  const [nombre, setNombre] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  
  // Nuevo estado para guardar y mostrar la lista de equipos inscritos
  const [listaEquipos, setListaEquipos] = useState<any[]>([]);

  // 1. Jugada para cargar los equipos desde la base de datos
  const cargarEquipos = async () => {
    const { data, error } = await supabase
      .from('equipos')
      .select('*')
      .order('created_at', { ascending: false }); // Los más recientes primero

    if (!error && data) {
      setListaEquipos(data);
    }
  };

  // Esto hace que los equipos se carguen automáticamente al abrir la página
  useEffect(() => {
    cargarEquipos();
  }, []);

  const toggleCategoria = (categoria: string) => {
    setCategoriasSeleccionadas((prev) => 
      prev.includes(categoria) 
        ? prev.filter((c) => c !== categoria) 
        : [...prev, categoria] 
    );
  };

  const registrarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (categoriasSeleccionadas.length === 0) {
      setMensaje('⚠️ Debes seleccionar al menos una categoría.');
      return;
    }

    setMensaje('⏳ Registrando equipo...');

    const { error } = await supabase
      .from('equipos')
      .insert([{ 
        nombre: nombre, 
        logo_url: logoUrl,
        categorias: categoriasSeleccionadas 
      }]);

    if (error) {
      setMensaje('❌ Hubo un error al registrar el equipo.');
      console.error(error);
    } else {
      setMensaje('✅ ¡Equipo registrado con éxito!');
      setNombre(''); 
      setLogoUrl('');
      setCategoriasSeleccionadas([]);
      cargarEquipos(); // Actualizamos la lista automáticamente al guardar
    }
  };

  // 2. Nueva Jugada: Eliminar un equipo
  const eliminarEquipo = async (id: number, nombreEquipo: string) => {
    // Pedimos confirmación para evitar borrados accidentales
    if (window.confirm(`¿Estás seguro de que deseas eliminar al equipo: ${nombreEquipo}?`)) {
      const { error } = await supabase
        .from('equipos')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Hubo un error al intentar eliminar el equipo.');
      } else {
        cargarEquipos(); // Refrescamos la lista para que desaparezca de la pantalla
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-12 px-4">
      <h1 className="text-3xl font-bold text-blue-400 mb-8 text-center">Mesa Técnica: Gestión de Equipos</h1>
      
      {/* Sección 1: Formulario de Registro */}
      <form onSubmit={registrarEquipo} className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-2xl mb-12">
        <h2 className="text-xl font-bold border-b border-gray-700 pb-2 mb-6">Inscribir Nuevo Equipo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre del Equipo *</label>
            <input 
              type="text" 
              required 
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-400 text-white"
              placeholder="Ej. Bravos de Lara"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">URL del Logotipo (Opcional)</label>
            <input 
              type="url" 
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-400 text-white"
              placeholder="https://ejemplo.com/logo.png"
            />
          </div>
        </div>

        <div className="mt-6 mb-6">
          <label className="block text-sm font-medium mb-3">Categorías a participar *</label>
          <div className="flex flex-wrap gap-4">
            {CATEGORIAS_DISPONIBLES.map((categoria) => (
              <label key={categoria} className="flex items-center space-x-2 cursor-pointer bg-gray-700 py-2 px-4 rounded-full hover:bg-gray-600 transition">
                <input 
                  type="checkbox" 
                  checked={categoriasSeleccionadas.includes(categoria)}
                  onChange={() => toggleCategoria(categoria)}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded"
                />
                <span className="text-sm font-medium">{categoria}</span>
              </label>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 px-4 rounded transition duration-200"
        >
          Guardar Registro
        </button>

        {mensaje && (
          <div className={`mt-6 text-center font-semibold text-sm p-3 rounded ${mensaje.includes('✅') ? 'bg-green-900/50 text-green-400' : mensaje.includes('⚠️') ? 'bg-yellow-900/50 text-yellow-400' : 'bg-blue-900/50 text-blue-400'}`}>
            {mensaje}
          </div>
        )}
      </form>

      {/* Sección 2: Lista de Equipos Registrados con opción de Eliminar */}
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Equipos Inscritos</h2>
        
        {listaEquipos.length === 0 ? (
          <p className="text-gray-400 italic">No hay equipos registrados todavía.</p>
        ) : (
          <div className="grid gap-4">
            {listaEquipos.map((equipo) => (
              <div key={equipo.id} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between shadow">
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{equipo.nombre}</span>
                  <span className="text-sm text-gray-400 mt-1">
                    Categorías: {equipo.categorias ? equipo.categorias.join(', ') : 'Ninguna'}
                  </span>
                </div>
                
                <button 
                  onClick={() => eliminarEquipo(equipo.id, equipo.nombre)}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded text-sm transition duration-200"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const CATEGORIAS_DISPONIBLES = [
  'U8', 'U10', 'U12', 'U14', 
  'U16 Femenino', 'U16 Masculino', 'U18', 'U20', 'Libre'
];

export default function RegistroEquipos() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  
  // Estado para saber si estamos editando
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const cargarEquipos = async () => {
    const { data, error } = await supabase
      .from('equipos')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (data) setEquipos(data);
  };

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

  const guardarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('Procesando la jugada...');

    if (categoriasSeleccionadas.length === 0) {
      setMensaje('❌ Falta técnica: El equipo debe participar al menos en una categoría.');
      return;
    }

    const datosEquipo = { 
      nombre, 
      logo_url: logoUrl,
      categorias: categoriasSeleccionadas 
    };

    if (editandoId) {
      // 🏀 JUGADA DE EDICIÓN (UPDATE)
      const { error } = await supabase
        .from('equipos')
        .update(datosEquipo)
        .eq('id', editandoId);

      if (error) {
        setMensaje(`❌ Error al actualizar: ${error.message}`);
      } else {
        setMensaje('✅ ¡Club actualizado con éxito!');
        limpiarFormulario();
        cargarEquipos();
      }
    } else {
      // 🏀 JUGADA DE CREACIÓN (INSERT)
      const { error } = await supabase
        .from('equipos')
        .insert([datosEquipo]);

      if (error) {
        setMensaje(`❌ Error en el registro: ${error.message}`);
      } else {
        setMensaje('✅ ¡Club registrado con éxito!');
        limpiarFormulario();
        cargarEquipos();
      }
    }
  };

  const editarEquipo = (equipo: any) => {
    setNombre(equipo.nombre);
    setLogoUrl(equipo.logo_url || '');
    setCategoriasSeleccionadas(equipo.categorias || []);
    setEditandoId(equipo.id);
    setMensaje('✏️ Modo edición activado. Corrige los datos y haz clic en "Actualizar Club".');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarEquipo = async (id: string) => {
    const confirmar = window.confirm("🚨 ¿Estás seguro de que deseas eliminar a este club? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    const { error } = await supabase.from('equipos').delete().eq('id', id);

    if (error) {
      alert(`❌ Error al eliminar: ${error.message}`);
    } else {
      alert("✅ ¡Club eliminado correctamente!");
      cargarEquipos();
      if (editandoId === id) limpiarFormulario();
    }
  };

  const limpiarFormulario = () => {
    setNombre('');
    setLogoUrl('');
    setCategoriasSeleccionadas([]);
    setEditandoId(null);
    if (mensaje.includes('Modo edición')) setMensaje('');
  };

  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-black text-center text-gray-900 mb-8 tracking-tight">
        Administrar <span className="text-blue-600">Clubes</span>
      </h1>

      {/* FORMULARIO DE REGISTRO / EDICIÓN */}
      <div className={`bg-white border-2 shadow-md rounded-xl p-8 mb-12 transition-colors ${editandoId ? 'border-yellow-400' : 'border-gray-200'}`}>
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
          {editandoId ? '✏️ Modificar Club Existente' : '🛡️ Registrar Nuevo Club'}
        </h2>

        <form onSubmit={guardarEquipo} className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Equipo *</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Guerreros BBC" className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-3">Categorías en las que participa *</label>
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
            <label className="block text-sm font-bold text-gray-700 mb-2">Enlace del Logotipo (Opcional)</label>
            <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-4 mt-4">
            <button type="submit" className={`w-full text-white font-bold py-3 rounded-lg transition-colors ${editandoId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editandoId ? 'Actualizar Club' : 'Inscribir Club'}
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

      {/* LISTA DE EQUIPOS PARA EDITAR Y ELIMINAR */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Clubes Registrados</h2>
        
        {equipos.length === 0 ? (
          <p className="text-gray-500 italic text-center py-6">No hay equipos registrados aún.</p>
        ) : (
          <div className="grid gap-4">
            {equipos.map(equipo => (
              <div key={equipo.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shrink-0">
                    {equipo.logo_url ? (
                      <img src={equipo.logo_url} alt={equipo.nombre} className="w-full h-full object-contain p-1 rounded-full" />
                    ) : (
                      <span className="text-gray-400 font-bold">{equipo.nombre.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900">{equipo.nombre}</p>
                    <p className="text-xs font-bold text-blue-600 mt-1">Categorías: {equipo.categorias?.join(', ') || 'Ninguna'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => editarEquipo(equipo)} className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-2 rounded-md transition-colors w-full md:w-auto">Modificar</button>
                  <button onClick={() => eliminarEquipo(equipo.id)} className="bg-red-100 hover:bg-red-600 text-red-700 hover:text-white font-bold px-6 py-2 rounded-md transition-colors w-full md:w-auto">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
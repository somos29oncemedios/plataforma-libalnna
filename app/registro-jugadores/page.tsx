'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const CATEGORIAS_DISPONIBLES = [
  'U8', 'U10', 'U12', 'U14', 
  'U16 Femenino', 'U16 Masculino', 'U18', 'U20'
];

export default function RegistroJugadores() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]); 
  
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');

  // 🏀 ESTADOS PARA LOS FILTROS
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [editandoId, setEditandoId] = useState<string | null>(null);

  // 🏀 ESTADO: Puntos totales por jugador
  const [puntosTotales, setPuntosTotales] = useState<any>({});

  const cargarDatos = async () => {
    const { data: eqData } = await supabase.from('equipos').select('*').order('nombre', { ascending: true });
    if (eqData) setEquipos(eqData);

    const { data: jugData } = await supabase
      .from('jugadores')
      .select('*, equipo:equipos!equipo_id(nombre)')
      .order('nombre', { ascending: true });
    if (jugData) setJugadores(jugData);

    const { data: statsData } = await supabase
      .from('box_scores')
      .select('jugador_id, puntos_totales');
      
    let ptsMap: any = {};
    if (statsData) {
      statsData.forEach((s: any) => {
        if (!ptsMap[s.jugador_id]) ptsMap[s.jugador_id] = 0;
        ptsMap[s.jugador_id] += (s.puntos_totales || 0);
      });
    }
    setPuntosTotales(ptsMap);
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
      const { error } = await supabase.from('jugadores').update(datosJugador).eq('id', editandoId);
      if (error) setMensaje(`❌ Error al actualizar: ${error.message}`);
      else {
        setMensaje('✅ ¡Atleta actualizado con éxito!');
        limpiarFormulario();
        cargarDatos();
      }
    } else {
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

  // 🏀 LÓGICA DE FILTRADO EN TIEMPO REAL
  const jugadoresFiltrados = jugadores.filter((jugador) => {
    const coincideBusqueda = jugador.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) || 
                             jugador.numero.toString().includes(filtroBusqueda);
    const coincideEquipo = filtroEquipo === '' || jugador.equipo_id.toString() === filtroEquipo;
    const coincideCategoria = filtroCategoria === '' || (jugador.categorias && jugador.categorias.includes(filtroCategoria));
    
    return coincideBusqueda && coincideEquipo && coincideCategoria;
  });

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

      {/* PANEL DE CONTEO Y FILTROS */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Panel de Control de Atletas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TARJETA DE MÉTRICA PRINCIPAL */}
          <div className="bg-blue-600 rounded-xl p-6 shadow-md text-white flex flex-col items-center justify-center transform transition-all hover:scale-105">
            <span className="text-blue-200 font-bold text-xs uppercase tracking-wider mb-2 text-center">Atletas Filtrados</span>
            <span className="text-6xl font-black">{jugadoresFiltrados.length}</span>
          </div>

          {/* CONTROLES DE FILTRO */}
          <div className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col gap-4 justify-center">
            <h3 className="text-xs font-bold text-gray-500 uppercase">Filtros Activos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <input 
                  type="text" 
                  placeholder="🔍 Nombre o número..." 
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-gray-700" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <select 
                  value={filtroEquipo} 
                  onChange={(e) => setFiltroEquipo(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-gray-700"
                >
                  <option value="">Todos los Clubes</option>
                  {equipos.map(equipo => (
                    <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <select 
                  value={filtroCategoria} 
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-gray-700"
                >
                  <option value="">Todas las Categorías</option>
                  {CATEGORIAS_DISPONIBLES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE JUGADORES (ALINEADA Y UNIFORME) */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        {jugadores.length === 0 ? (
          <p className="text-gray-500 italic text-center py-6">No hay jugadores registrados en la base de datos.</p>
        ) : jugadoresFiltrados.length === 0 ? (
          <p className="text-gray-500 italic text-center py-6">No se encontraron atletas con esos filtros.</p>
        ) : (
          <div className="grid gap-4">
            {jugadoresFiltrados.map(jugador => (
              <div key={jugador.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors gap-4">
                
                {/* 1. Info y Foto (Ocupa todo el espacio restante con flex-1) */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:flex-1 text-center sm:text-left">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 border-gray-300 shadow-sm">
                    {jugador.foto_url ? (
                      <img src={jugador.foto_url} alt={jugador.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 font-black text-xl">#{jugador.numero}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-black text-gray-900 truncate">
                      {jugador.nombre} <span className="text-sm font-bold text-gray-500 ml-2">#{jugador.numero}</span>
                    </p>
                    <p className="text-sm font-bold text-blue-600 truncate">{jugador.equipo?.nombre || 'Sin Equipo'}</p>
                    <p className="text-xs font-semibold text-gray-500 mt-1 truncate">Cats: {jugador.categorias?.join(', ')}</p>
                  </div>
                </div>
                
                {/* 2. Tarjeta de Puntos y Botones de Acción (Agrupados y alineados uniformemente) */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  {/* Tarjeta de Puntos Totales (Ancho fijo w-24) */}
                  <div className="bg-yellow-50 border border-yellow-300 px-2 py-2 rounded-xl flex flex-col items-center justify-center shadow-sm w-24 shrink-0">
                    <span className="text-[10px] font-black text-yellow-800 uppercase tracking-wider">Total PTS</span>
                    <span className="text-2xl font-black text-gray-900">{puntosTotales[jugador.id] || 0}</span>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => editarJugador(jugador)} className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-4 py-2 rounded-md transition-colors w-full sm:w-auto shadow-sm">Modificar</button>
                    <button onClick={() => eliminarJugador(jugador.id)} className="bg-red-100 hover:bg-red-600 text-red-700 hover:text-white font-bold px-4 py-2 rounded-md transition-colors w-full sm:w-auto shadow-sm">Eliminar</button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CATEGORIAS_DISPONIBLES = [
  'U8', 'U10', 'U12', 'U14', 
  'U16 Femenino', 'U16 Masculino', 'U18', 'U20'
];

// 🏀 Configuración del Bucket
const NOMBRE_BUCKET = 'fotos_jugadores';

// 🏀 Convertidor de Imágenes para PDF
const obtenerBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = error => reject(error);
    img.src = url;
  });
};

// 🏀 Compresor de Imágenes para Ahorrar Espacio (Frontend)
const comprimirImagen = (archivo: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.readAsDataURL(archivo);
    lector.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Comprime a JPEG con 70% de calidad
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error al comprimir'));
        }, 'image/jpeg', 0.7);
      };
    };
    lector.onerror = (error) => reject(error);
  });
};

export default function RegistroJugadores() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]); 
  
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Estados de Filtros
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [editandoId, setEditandoId] = useState<string | null>(null);
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

  // 🏀 Procesador de subida de imagen
  const manejarSubidaFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setMensaje('⏳ Optimizando y subiendo fotografía...');
    setSubiendoFoto(true);

    try {
      const imagenComprimida = await comprimirImagen(archivo);
      const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(NOMBRE_BUCKET)
        .upload(nombreArchivo, imagenComprimida, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(NOMBRE_BUCKET)
        .getPublicUrl(nombreArchivo);

      setFotoUrl(publicUrl);
      setMensaje('✅ ¡Fotografía lista!');
      
      // Limpia el input para permitir subir otra si se desea
      e.target.value = '';
    } catch (error: any) {
      setMensaje(`❌ Error al subir: ${error.message}`);
    } finally {
      setSubiendoFoto(false);
    }
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

  const jugadoresFiltrados = jugadores.filter((jugador) => {
    const coincideBusqueda = jugador.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) || 
                             jugador.numero.toString().includes(filtroBusqueda);
    const coincideEquipo = filtroEquipo === '' || jugador.equipo_id.toString() === filtroEquipo;
    const coincideCategoria = filtroCategoria === '' || (jugador.categorias && jugador.categorias.includes(filtroCategoria));
    
    return coincideBusqueda && coincideEquipo && coincideCategoria;
  });

  const descargarRosterPDF = async () => {
    const doc = new jsPDF();
    const nombreEquipo = filtroEquipo 
      ? equipos.find(e => e.id.toString() === filtroEquipo)?.nombre || 'Equipo Desconocido'
      : 'Todos los Clubes';
    const nombreCategoria = filtroCategoria || 'Todas las Categorías';

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Roster Oficial: ${nombreEquipo}`, 14, 15);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Categoría: ${nombreCategoria} | Total: ${jugadoresFiltrados.length} atletas`, 14, 22);

    const cuerpoTabla: any[] = [];
    const fotosBase64: { [key: number]: string } = {};

    for (let i = 0; i < jugadoresFiltrados.length; i++) {
      const atleta = jugadoresFiltrados[i];
      cuerpoTabla.push([
        '', 
        atleta.numero || '-',
        atleta.nombre,
        atleta.equipo?.nombre || 'Sin Equipo',
        atleta.categorias?.join(', ') || 'N/A'
      ]);

      if (atleta.foto_url) {
        try {
          fotosBase64[i] = await obtenerBase64(atleta.foto_url);
        } catch (e) {
          console.warn(`No se pudo cargar la foto de ${atleta.nombre}`);
        }
      }
    }

    autoTable(doc, {
      startY: 30,
      head: [['Foto', 'N#', 'Nombre Completo', 'Club', 'Categorías']],
      body: cuerpoTabla,
      headStyles: { fillColor: [37, 99, 235] },
      bodyStyles: { minCellHeight: 22, valign: 'middle' },
      didDrawCell: (data) => {
        if (data.column.index === 0 && data.cell.section === 'body') {
          const rowIndex = data.row.index;
          if (fotosBase64[rowIndex]) {
            doc.addImage(fotosBase64[rowIndex], 'JPEG', data.cell.x + 3, data.cell.y + 2, 16, 18);
          }
        }
      }
    });

    doc.save(`Roster_${nombreEquipo}_${nombreCategoria}.pdf`.replace(/ /g, "_"));
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

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <label className="block text-sm font-bold text-blue-900 mb-2">Fotografía del Atleta</label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input 
                type="file" 
                accept="image/*"
                onChange={manejarSubidaFoto}
                disabled={subiendoFoto}
                className="w-full sm:w-2/3 border border-blue-200 bg-white p-2 rounded-lg text-sm focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer"
              />
              {fotoUrl && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-green-500 shadow-sm shrink-0">
                  <img src={fotoUrl} alt="Vista previa" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setFotoUrl('')} 
                    className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl-lg hover:bg-red-700"
                    title="Eliminar foto"
                  >
                    X
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <button 
              type="submit" 
              disabled={subiendoFoto}
              className={`w-full text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 ${editandoId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
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
          <div className={`mt-6 text-center font-semibold p-4 rounded-lg border ${mensaje.includes('❌') ? 'bg-red-50 text-red-800 border-red-200' : mensaje.includes('✏️') ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : mensaje.includes('⏳') ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
            {mensaje}
          </div>
        )}
      </div>

      {/* PANEL DE CONTEO Y FILTROS */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Panel de Control de Atletas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-600 rounded-xl p-6 shadow-md text-white flex flex-col items-center justify-center transform transition-all hover:scale-105">
            <span className="text-blue-200 font-bold text-xs uppercase tracking-wider mb-2 text-center">Atletas Filtrados</span>
            <span className="text-6xl font-black">{jugadoresFiltrados.length}</span>
          </div>

          <div className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col gap-4 justify-center">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase">Filtros Activos</h3>
              <button
                onClick={descargarRosterPDF}
                disabled={jugadoresFiltrados.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white font-black px-4 py-2 rounded-lg uppercase tracking-wide text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                📄 Descargar PDF
              </button>
            </div>

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

      {/* LISTA DE JUGADORES */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        {jugadores.length === 0 ? (
          <p className="text-gray-500 italic text-center py-6">No hay jugadores registrados en la base de datos.</p>
        ) : jugadoresFiltrados.length === 0 ? (
          <p className="text-gray-500 italic text-center py-6">No se encontraron atletas con esos filtros.</p>
        ) : (
          <div className="grid gap-4">
            {jugadoresFiltrados.map(jugador => (
              <div key={jugador.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors gap-4">
                
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
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  <div className="bg-yellow-50 border border-yellow-300 px-2 py-2 rounded-xl flex flex-col items-center justify-center shadow-sm w-24 shrink-0">
                    <span className="text-[10px] font-black text-yellow-800 uppercase tracking-wider">Total PTS</span>
                    <span className="text-2xl font-black text-gray-900">{puntosTotales[jugador.id] || 0}</span>
                  </div>

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
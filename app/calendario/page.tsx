'use client';

import { useState, useEffect } from "react";
import { supabase } from "../supabase"; // Conexión a nuestra base de datos

export default function Calendario() {
  // 1. Añadimos "Todas" al inicio de las categorías y la ponemos como activa por defecto
  const categorias = ["Todas", "U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);

  // 2. Estados para manejar los datos reales
  const [partidos, setPartidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // 3. Buscar los partidos programados en la base de datos
  useEffect(() => {
    const fetchPartidos = async () => {
      const { data, error } = await supabase
        .from('partidos')
        .select(`
          id,
          fecha,
          hora,
          estado,
          fase_torneo,
          lugar,
          categoria,
          local:equipos!equipo_local_id(nombre, logo_url),
          visitante:equipos!equipo_visitante_id(nombre, logo_url)
        `)
        // Ordenamos cronológicamente: primero por fecha, luego por hora
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (data) {
        setPartidos(data);
      }
      setCargando(false);
    };

    fetchPartidos();
  }, []);

  // 4. Armador: Filtrar los partidos según la pestaña elegida o mostrarlos todos
  const partidosFiltrados = categoriaActiva === "Todas" 
    ? partidos 
    : partidos.filter(partido => partido.categoria === categoriaActiva);

  return (
    <main className="container mx-auto py-12 px-4">
      {/* Encabezado */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-libalnna-dark uppercase tracking-tight">
            Calendario de Juegos
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Temporada Regular - Torneo Formativo</p>
        </div>
      </div>

      {/* Selector de Categorías (Pestañas) */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
              categoriaActiva === cat
                ? "bg-libalnna-blue text-white shadow-md"
                : "bg-white text-gray-500 hover:bg-gray-100 hover:text-libalnna-dark border border-gray-200"
            }`}
          >
            {/* Si es "Todas", mostramos un texto distinto, si no, "Categoría X" */}
            {cat === "Todas" ? "Todas las Categorías" : `Categoría ${cat}`}
          </button>
        ))}
      </div>

      {/* Lista de Partidos Dinámica */}
      {cargando ? (
        <div className="text-center py-20 text-xl font-bold text-gray-500">Cargando la cartelera oficial...</div>
      ) : partidosFiltrados.length === 0 ? (
        <div className="text-center py-20 text-xl font-bold text-gray-500">
          No hay partidos programados {categoriaActiva !== "Todas" ? `para la Categoría ${categoriaActiva}` : "aún"}.
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-4xl">
          {partidosFiltrados.map((partido) => (
            <div key={partido.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              
              {/* Cabecera del partido (Fecha y Cancha) */}
              <div className="bg-libalnna-light px-6 py-3 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span className="font-bold text-libalnna-dark text-sm">{partido.fecha} • {partido.hora}</span>
                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 uppercase tracking-wider">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  {/* Agregamos la categoría aquí para que se vea claro en la lista general */}
                  {partido.lugar} • <span className="text-libalnna-blue">{partido.categoria}</span> • {partido.fase_torneo}
                </span>
              </div>

              {/* Cuerpo del partido (Equipos y Marcador) */}
              <div className="px-6 py-8 flex flex-row items-center justify-between md:justify-center md:gap-16">
                
                {/* Equipo Local */}
                <div className="flex flex-col items-center gap-3 w-1/3 md:w-auto">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0">
                    {partido.local?.logo_url ? (
                      <img src={partido.local.logo_url} alt={partido.local.nombre} className="w-full h-full object-contain p-1 rounded-full" />
                    ) : (
                      <span className="text-gray-300 font-black text-2xl">{partido.local?.nombre?.charAt(0) || 'L'}</span>
                    )}
                  </div>
                  <span className="font-bold text-libalnna-dark text-sm md:text-base text-center uppercase">{partido.local?.nombre || 'Local'}</span>
                </div>

                {/* Marcador Central */}
                <div className="flex flex-col items-center justify-center w-1/3 md:w-auto">
                  {partido.estado === "finalizado" ? (
                    <>
                      <div className="flex items-center gap-4 md:gap-8">
                        {/* Nota Táctica: Por ahora los dejamos con un guion vacío, luego los conectaremos a los box_scores */}
                        <span className="text-3xl md:text-5xl font-black text-libalnna-dark">-</span>
                        <span className="text-gray-300 font-black text-xl">-</span>
                        <span className="text-3xl md:text-5xl font-black text-libalnna-dark">-</span>
                      </div>
                      <span className="mt-2 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">FINALIZADO</span>
                    </>
                  ) : partido.estado === "en curso" ? (
                     <>
                      <span className="text-3xl md:text-5xl font-black text-libalnna-green">EN VIVO</span>
                      <span className="mt-2 text-xs font-bold text-libalnna-green bg-green-50 px-3 py-1 rounded-full border border-green-100">JUGANDO</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl md:text-5xl font-black text-gray-200">VS</span>
                      <span className="mt-2 text-xs font-bold text-libalnna-blue bg-blue-50 px-3 py-1 rounded-full border border-blue-100">POR JUGAR</span>
                    </>
                  )}
                </div>

                {/* Equipo Visitante */}
                <div className="flex flex-col items-center gap-3 w-1/3 md:w-auto">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0">
                    {partido.visitante?.logo_url ? (
                      <img src={partido.visitante.logo_url} alt={partido.visitante.nombre} className="w-full h-full object-contain p-1 rounded-full" />
                    ) : (
                      <span className="text-gray-300 font-black text-2xl">{partido.visitante?.nombre?.charAt(0) || 'V'}</span>
                    )}
                  </div>
                  <span className="font-bold text-libalnna-dark text-sm md:text-base text-center uppercase">{partido.visitante?.nombre || 'Visitante'}</span>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
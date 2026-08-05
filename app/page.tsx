'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from './supabase';

const ORDEN_CATEGORIAS = ['U8', 'U10', 'U12', 'U14', 'U16 Femenino', 'U16 Masculino', 'U18', 'U20'];

export default function Home() {
  const [equipos, setEquipos] = useState<any[]>([]);

  useEffect(() => {
    const fetchEquipos = async () => {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('nombre', { ascending: true }); 

      if (!error && data) {
        setEquipos(data);
      }
    };

    fetchEquipos();
  }, []);

  const ordenarCategorias = (categorias: string[]) => {
    if (!categorias) return [];
    return [...categorias].sort(
      (a, b) => ORDEN_CATEGORIAS.indexOf(a) - ORDEN_CATEGORIAS.indexOf(b)
    );
  };

  return (
    <main className="container mx-auto flex flex-col items-center justify-center py-10 md:py-16 px-4">
      
      {/* Banner Principal */}
      <div className="flex flex-col items-center mb-12 md:mb-16 text-center w-full">
        <div className="mb-6 md:mb-8">
          <img 
            src="/logo-libalnna.png" 
            alt="Logo Libalnna" 
            className="h-28 md:h-40 w-auto object-contain mx-auto" 
          />
        </div>
        
        {/* Ajuste Móvil: flex-col y w-full para que los botones sean fáciles de tocar en celulares */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto mt-2 md:mt-6">
          <Link href="/calendario" className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 md:py-4 rounded-xl font-black uppercase tracking-wide hover:bg-blue-700 transition-colors shadow-lg text-center text-sm md:text-base">
            Partidos de Hoy
          </Link>
          <Link href="/posiciones" className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-900 px-8 py-3.5 md:py-4 rounded-xl font-black uppercase tracking-wide hover:bg-gray-900 hover:text-white transition-colors shadow-lg text-center text-sm md:text-base">
            Tabla de Posiciones
          </Link>
        </div>
      </div>
      
      {/* Sección: Equipos Oficiales */}
      <div className="w-full max-w-6xl">
        <h2 className="text-2xl md:text-4xl font-black text-center mb-8 md:mb-10 tracking-tight text-gray-900 uppercase">
          Equipos <span className="text-blue-600">Oficiales</span>
        </h2>

        {/* Ajuste Móvil: grid-cols-2 por defecto, creciendo a 3 y 4 en pantallas más grandes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {equipos.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center py-10 font-medium">
              Cargando equipos en la pista...
            </p>
          ) : (
            equipos.map((equipo) => (
              <Link 
                href={`/equipos?id=${equipo.id}`}
                key={equipo.id} 
                className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 flex flex-col items-center shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 cursor-pointer group"
              >
                
                {/* Logo del Equipo (Escalado para móviles) */}
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center bg-gray-50 mb-3 md:mb-4 overflow-hidden border-2 border-gray-100 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                  {equipo.logo_url ? (
                    <img 
                      src={equipo.logo_url} 
                      alt={`Logo de ${equipo.nombre}`} 
                      className="w-full h-full object-contain p-2 md:p-3" 
                    />
                  ) : (
                    <span className="text-3xl md:text-5xl font-black text-gray-300 group-hover:text-blue-400 transition-colors">
                      {equipo.nombre.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Nombre del equipo */}
                <h3 className="text-sm md:text-lg font-black text-center text-gray-900 mb-2 md:mb-3 group-hover:text-blue-600 transition-colors uppercase leading-tight line-clamp-2">
                  {equipo.nombre}
                </h3>

                {/* Categorías Ordenadas (Etiquetas más compactas en móviles) */}
                {equipo.categorias && equipo.categorias.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
                    {ordenarCategorias(equipo.categorias).map((cat: string) => (
                      <span 
                        key={cat} 
                        className="text-[9px] md:text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 md:py-1 rounded-full group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-700 transition-colors whitespace-nowrap"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
      
    </main>
  );
}
'use client';

import { useState, useEffect } from 'react';
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
    <main className="container mx-auto flex flex-col items-center justify-center py-16 px-4">
      
      {/* Banner Principal sin textos de relleno */}
      <div className="flex flex-col items-center mb-16 text-center">
        <div className="mb-6">
          <img 
            src="/logo-libalnna.png" 
            alt="Logo Libalnna" 
            className="h-32 md:h-40 w-auto object-contain mx-auto" 
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-6">
          <button className="bg-blue-600 text-white px-8 py-3 rounded-md font-bold hover:bg-blue-700 transition-colors shadow-sm">
            Partidos de Hoy
          </button>
          <button className="bg-white text-gray-900 border-2 border-gray-900 px-8 py-3 rounded-md font-bold hover:bg-gray-900 hover:text-white transition-colors shadow-sm">
            Tabla de Posiciones
          </button>
        </div>
      </div>
      
      {/* Sección: Equipos Oficiales */}
      <div className="w-full max-w-5xl">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-10 tracking-tight text-gray-900">
          Equipos <span className="text-blue-600">Oficiales</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {equipos.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center py-10 font-medium">
              Cargando equipos en la pista...
            </p>
          ) : (
            equipos.map((equipo) => (
              <div 
                key={equipo.id} 
                className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center shadow-sm hover:shadow-md transition duration-300"
              >
                
                {/* Logo del Equipo */}
                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gray-100 mb-4 overflow-hidden border-2 border-gray-200">
                  {equipo.logo_url ? (
                    <img 
                      src={equipo.logo_url} 
                      alt={`Logo de ${equipo.nombre}`} 
                      className="w-full h-full object-contain p-2" 
                    />
                  ) : (
                    <span className="text-4xl font-black text-gray-400">
                      {equipo.nombre.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Nombre */}
                <h3 className="text-lg font-bold text-center text-gray-900 mb-3">
                  {equipo.nombre}
                </h3>

                {/* Categorías Ordenadas */}
                {equipo.categorias && equipo.categorias.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {ordenarCategorias(equipo.categorias).map((cat: string) => (
                      <span 
                        key={cat} 
                        className="text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 px-2 py-1 rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
    </main>
  );
}
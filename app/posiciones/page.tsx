'use client';

import { useState, useEffect } from "react";
import { supabase } from "../supabase"; 

export default function TablaPosiciones() {
  const categorias = ["U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);
  const [posiciones, setPosiciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const calcularPosiciones = async () => {
      setCargando(true);
      
      // 1. Obtener todos los equipos de la categoría activa
      const { data: equiposData } = await supabase.from('equipos').select('*');
      
      const equiposFiltrados = equiposData?.filter(eq => 
        eq.categorias && eq.categorias.includes(categoriaActiva)
      ) || [];

      // 2. Obtener todos los partidos finalizados de esta categoría
      const { data: partidos } = await supabase
        .from('partidos')
        .select('*')
        .eq('categoria', categoriaActiva)
        .eq('estado', 'finalizado');

      let stats: any = {};
      equiposFiltrados.forEach(eq => {
        stats[eq.id] = {
          id: eq.id,
          nombre: eq.nombre,
          logo_url: eq.logo_url,
          pj: 0, 
          jg: 0, 
          jp: 0, 
          pf: 0, 
          pc: 0, 
          pts: 0 
        };
      });

      // 3. Procesar resultados usando directamente puntos_local y puntos_visitante de la tabla partidos
      if (partidos) {
        partidos.forEach(partido => {
          const localId = partido.equipo_local_id;
          const visitanteId = partido.equipo_visitante_id;

          const ptsLocal = partido.puntos_local || 0;
          const ptsVisitante = partido.puntos_visitante || 0;

          const local = stats[localId];
          const visitante = stats[visitanteId];

          if (local && visitante) {
            local.pj += 1;
            visitante.pj += 1;
            local.pf += ptsLocal;
            local.pc += ptsVisitante;
            visitante.pf += ptsVisitante;
            visitante.pc += ptsLocal;

            if (ptsLocal > ptsVisitante) {
              local.jg += 1;
              local.pts += 2; // 2 puntos por victoria
              visitante.jp += 1;
              visitante.pts += 1; // 1 punto por derrota
            } else if (ptsVisitante > ptsLocal) {
              visitante.jg += 1;
              visitante.pts += 2;
              local.jp += 1;
              local.pts += 1;
            } else {
              // En caso de empate (si aplica en alguna categoría formativa)
              local.pts += 1;
              visitante.pts += 1;
            }
          }
        });
      }

      // 4. Ordenar la tabla: Primero por Puntos (PTS), luego por Diferencia de Puntos (DIF) y Puntos a Favor (PF)
      const tabla = Object.values(stats)
        .sort((a: any, b: any) => {
          if (b.pts !== a.pts) return b.pts - a.pts; 
          const difA = a.pf - a.pc;
          const difB = b.pf - b.pc;
          if (difB !== difA) return difB - difA;
          return b.pf - a.pf;
        });

      setPosiciones(tabla);
      setCargando(false);
    };

    calcularPosiciones();
  }, [categoriaActiva]);

  return (
    <main className="container mx-auto py-8 md:py-12 px-4 max-w-5xl">
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">Tabla de Posiciones</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1 font-medium">Clasificación General Oficial - Libalnna</p>
      </div>

      {/* Selector de Categorías (Pestañas) */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-5 py-2 md:px-6 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
              categoriaActiva === cat
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Diseño de la Tabla de Posiciones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[11px] md:text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-3 py-4 font-bold text-center">Pos</th>
                <th className="px-3 py-4 font-bold">Equipo</th>
                <th className="px-3 py-4 font-bold text-center">PJ</th>
                <th className="px-3 py-4 font-bold text-center">JG</th>
                <th className="px-3 py-4 font-bold text-center">JP</th>
                <th className="px-3 py-4 font-bold text-center">PF</th>
                <th className="px-3 py-4 font-bold text-center">PC</th>
                <th className="px-3 py-4 font-bold text-center">DIF</th>
                <th className="px-3 py-4 font-bold text-center text-blue-600">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500 font-bold text-sm">Calculando posiciones...</td>
                </tr>
              ) : posiciones.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500 font-bold text-sm">No hay equipos registrados o partidos finalizados en esta categoría.</td>
                </tr>
              ) : (
                posiciones.map((equipo, index) => (
                  <tr key={equipo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-4 font-black text-gray-900 text-center">{index + 1}</td>
                    <td className="px-3 py-4 flex items-center gap-2 md:gap-3 font-bold text-sm md:text-base text-gray-900 uppercase whitespace-nowrap">
                      <div className="w-7 h-7 md:w-8 md:h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 border border-gray-200">
                        {equipo.logo_url ? (
                          <img src={equipo.logo_url} alt={equipo.nombre} className="w-full h-full object-contain p-0.5 rounded-full" />
                        ) : (
                          <span className="text-gray-400 text-[10px] md:text-xs">{equipo.nombre.charAt(0)}</span>
                        )}
                      </div>
                      <span className="truncate max-w-[150px] md:max-w-none">{equipo.nombre}</span>
                    </td>
                    <td className="px-3 py-4 text-center font-semibold text-gray-600 text-sm md:text-base">{equipo.pj}</td>
                    <td className="px-3 py-4 text-center font-bold text-green-600 text-sm md:text-base">{equipo.jg}</td>
                    <td className="px-3 py-4 text-center font-bold text-red-500 text-sm md:text-base">{equipo.jp}</td>
                    <td className="px-3 py-4 text-center font-semibold text-gray-600 text-sm md:text-base">{equipo.pf}</td>
                    <td className="px-3 py-4 text-center font-semibold text-gray-600 text-sm md:text-base">{equipo.pc}</td>
                    <td className="px-3 py-4 text-center font-bold text-gray-800 text-sm md:text-base">
                      {(equipo.pf - equipo.pc) > 0 ? `+${equipo.pf - equipo.pc}` : equipo.pf - equipo.pc}
                    </td>
                    <td className="px-3 py-4 text-center font-black text-blue-600 text-base md:text-lg">{equipo.pts}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
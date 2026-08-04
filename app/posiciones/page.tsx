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
      
      // 1. Obtener todos los equipos de la base de datos
      const { data: equiposData } = await supabase.from('equipos').select('*');
      
      // 🏀 LA NUEVA JUGADA: Filtrar solo los equipos que pertenecen a la categoría activa
      // Revisamos si el equipo tiene categorías registradas y si incluye la pestaña actual
      const equiposFiltrados = equiposData?.filter(eq => 
        eq.categorias && eq.categorias.includes(categoriaActiva)
      ) || [];

      // 2. Obtener solo los partidos "finalizados" de la categoría que el fanático está viendo
      const { data: partidos } = await supabase
        .from('partidos')
        .select('*')
        .eq('categoria', categoriaActiva)
        .eq('estado', 'finalizado');

      // 3. Obtener las estadísticas (box_scores) para saber los puntos reales anotados
      const partidoIds = partidos?.map(p => p.id) || [];
      let boxScores: any[] = [];
      
      if (partidoIds.length > 0) {
        const { data } = await supabase
          .from('box_scores')
          .select('partido_id, equipo_id, puntos_totales')
          .in('partido_id', partidoIds);
        if (data) boxScores = data;
      }

      // 4. Lógica de Pizarra: Preparar el contador en cero SOLO para los equipos filtrados
      let stats: any = {};
      equiposFiltrados.forEach(eq => {
        stats[eq.id] = {
          id: eq.id,
          nombre: eq.nombre,
          logo_url: eq.logo_url,
          pj: 0, // Partidos Jugados
          jg: 0, // Juegos Ganados
          jp: 0, // Juegos Perdidos
          pf: 0, // Puntos a Favor
          pc: 0, // Puntos en Contra
          pts: 0 // Puntos de Clasificación (Regla FIBA: 2 por victoria, 1 por derrota)
        };
      });

      // 5. Calcular los resultados de cada partido finalizado
      if (partidos && boxScores) {
        partidos.forEach(partido => {
          let ptsLocal = 0;
          let ptsVisitante = 0;

          // Sumar los puntos de los jugadores de cada equipo en ese partido específico
          boxScores.forEach(bx => {
            if (bx.partido_id === partido.id) {
              if (bx.equipo_id === partido.equipo_local_id) ptsLocal += bx.puntos_totales;
              if (bx.equipo_id === partido.equipo_visitante_id) ptsVisitante += bx.puntos_totales;
            }
          });

          // Anotar en la tabla general
          const local = stats[partido.equipo_local_id];
          const visitante = stats[partido.equipo_visitante_id];

          // Solo sumamos si ambos equipos son parte de esta categoría
          if (local && visitante) {
            local.pj += 1;
            visitante.pj += 1;
            local.pf += ptsLocal;
            local.pc += ptsVisitante;
            visitante.pf += ptsVisitante;
            visitante.pc += ptsLocal;

            // Definir ganador y perdedor (Reglas FIBA)
            if (ptsLocal > ptsVisitante) {
              local.jg += 1;
              local.pts += 2;
              visitante.jp += 1;
              visitante.pts += 1;
            } else if (ptsVisitante > ptsLocal) {
              visitante.jg += 1;
              visitante.pts += 2;
              local.jp += 1;
              local.pts += 1;
            }
          }
        });
      }

      // 6. Convertir a lista y ordenar: Primero por Puntos (PTS) y luego por Diferencia (PF - PC)
      const tabla = Object.values(stats)
        .sort((a: any, b: any) => {
          if (b.pts !== a.pts) return b.pts - a.pts; // Ordenar por puntos
          return (b.pf - b.pc) - (a.pf - a.pc);     // Desempate por diferencia de puntos
        });

      setPosiciones(tabla);
      setCargando(false);
    };

    calcularPosiciones();
  }, [categoriaActiva]);

  return (
    <main className="container mx-auto py-12 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Tabla de Posiciones</h1>
        <p className="text-gray-500 mt-1 font-medium">Clasificación General Oficial - Libalnna</p>
      </div>

      {/* Selector de Categorías (Pestañas) */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
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
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="p-4 font-bold text-center">Pos</th>
                <th className="p-4 font-bold">Equipo</th>
                <th className="p-4 font-bold text-center">PJ</th>
                <th className="p-4 font-bold text-center">JG</th>
                <th className="p-4 font-bold text-center">JP</th>
                <th className="p-4 font-bold text-center">PF</th>
                <th className="p-4 font-bold text-center">PC</th>
                <th className="p-4 font-bold text-center">DIF</th>
                <th className="p-4 font-bold text-center text-blue-600">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500 font-bold">Calculando posiciones...</td>
                </tr>
              ) : posiciones.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500 font-bold">No hay equipos registrados en esta categoría.</td>
                </tr>
              ) : (
                posiciones.map((equipo, index) => (
                  <tr key={equipo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-black text-gray-900 text-center">{index + 1}</td>
                    <td className="p-4 flex items-center gap-3 font-bold text-gray-900 uppercase">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                        {equipo.logo_url ? (
                          <img src={equipo.logo_url} alt={equipo.nombre} className="w-full h-full object-contain p-0.5 rounded-full" />
                        ) : (
                          <span className="text-gray-400 text-xs">{equipo.nombre.charAt(0)}</span>
                        )}
                      </div>
                      {equipo.nombre}
                    </td>
                    <td className="p-4 text-center font-semibold text-gray-600">{equipo.pj}</td>
                    <td className="p-4 text-center font-bold text-green-600">{equipo.jg}</td>
                    <td className="p-4 text-center font-bold text-red-500">{equipo.jp}</td>
                    <td className="p-4 text-center font-semibold text-gray-600">{equipo.pf}</td>
                    <td className="p-4 text-center font-semibold text-gray-600">{equipo.pc}</td>
                    <td className="p-4 text-center font-bold text-gray-800">{equipo.pf - equipo.pc}</td>
                    <td className="p-4 text-center font-black text-blue-600 text-lg">{equipo.pts}</td>
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
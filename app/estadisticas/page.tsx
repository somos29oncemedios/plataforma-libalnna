"use client";

import { useState } from "react";

export default function Estadisticas() {
  const categorias = ["U8", "U10", "U12", "U14", "U16", "U18", "U20"];
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);

  // Agregamos el campo "logo" (por ahora vacío, luego pondremos la URL de la imagen real)
  const equipos = [
    { id: 1, pos: 1, nombre: "Guerreros", logo: "", jj: 10, jg: 8, jp: 2, pf: 850, pc: 780 },
    { id: 2, pos: 2, nombre: "Titanes", logo: "", jj: 10, jg: 7, jp: 3, pf: 820, pc: 790 },
    { id: 3, pos: 3, nombre: "Leones", logo: "", jj: 10, jg: 5, jp: 5, pf: 800, pc: 800 },
    { id: 4, pos: 4, nombre: "Águilas", logo: "", jj: 10, jg: 3, jp: 7, pf: 750, pc: 810 },
  ];

  return (
    <main className="container mx-auto py-12 px-4">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-libalnna-dark uppercase tracking-tight">
            Tabla de Posiciones
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Torneo Formativo - Edición Actual</p>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide">
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
            Categoría {cat}
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-libalnna-light text-libalnna-dark text-sm border-b-2 border-libalnna-blue">
              <th className="p-4 font-bold text-center w-16">POS</th>
              <th className="p-4 font-bold">EQUIPO</th>
              <th className="p-4 font-bold text-center w-20">JJ</th>
              <th className="p-4 font-bold text-center w-20">JG</th>
              <th className="p-4 font-bold text-center w-20">JP</th>
              <th className="p-4 font-bold text-center w-24">DIF</th>
              <th className="p-4 font-bold text-center w-24">PCT</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {equipos.map((equipo) => {
              const dif = equipo.pf - equipo.pc;
              const pct = (equipo.jg / equipo.jj).toFixed(3).replace("0.", ".");

              return (
                <tr key={equipo.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-center font-bold text-libalnna-dark">{equipo.pos}</td>
                  
                  {/* NUEVA COLUMNA DE EQUIPO CON LOGO */}
                  <td className="p-4 font-bold text-libalnna-blue">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 overflow-hidden shrink-0">
                        {equipo.logo ? (
                          <img src={equipo.logo} alt={equipo.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 font-black text-xs">{equipo.nombre.charAt(0)}</span>
                        )}
                      </div>
                      <span>{equipo.nombre}</span>
                    </div>
                  </td>

                  <td className="p-4 text-center text-gray-600">{equipo.jj}</td>
                  <td className="p-4 text-center font-bold text-libalnna-green">{equipo.jg}</td>
                  <td className="p-4 text-center font-bold text-libalnna-red">{equipo.jp}</td>
                  <td className="p-4 text-center text-gray-600 font-medium">{dif > 0 ? `+${dif}` : dif}</td>
                  <td className="p-4 text-center font-bold text-libalnna-dark">{pct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function PanelEmparejamientos() {
  const CATEGORIAS = ["U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];
  
  const [categoriaActiva, setCategoriaActiva] = useState("U10");
  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidosTemporada, setPartidosTemporada] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estado temporal para guardar lo que escribes en cada emparejamiento
  const [borradores, setDrafts] = useState<any>({});

  const cargarDatos = async () => {
    setCargando(true);
    
    const { data: eqs } = await supabase.from('equipos').select('*').order('nombre');
    if (eqs) setEquipos(eqs);

    const { data: pts } = await supabase
      .from('partidos')
      .select('*, local:equipos!equipo_local_id(nombre, logo_url), visitante:equipos!equipo_visitante_id(nombre, logo_url)')
      .eq('fase_torneo', 'Temporada Regular');
    if (pts) setPartidosTemporada(pts);

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // 🏀 MOTOR DE GENERACIÓN INTELIGENTE (Simple vs Ida y Vuelta)
  
  const equiposCategoria = equipos.filter(e => {
    if (Array.isArray(e.categorias)) return e.categorias.includes(categoriaActiva);
    return e.categoria === categoriaActiva;
  });

  const isDobleRonda = categoriaActiva === "U16 Femenino" || categoriaActiva === "U16 Masculino";
  const emparejamientosTotales = [];

  // Lógica de cruces matemáticos
  for (let i = 0; i < equiposCategoria.length; i++) {
    for (let j = 0; j < equiposCategoria.length; j++) {
      if (i === j) continue; // Un equipo no juega contra sí mismo

      if (isDobleRonda) {
        // Formato Doble: Agregamos A vs B y B vs A
        emparejamientosTotales.push({
          id: `${equiposCategoria[i].id}-${equiposCategoria[j].id}`,
          local: equiposCategoria[i],
          visitante: equiposCategoria[j]
        });
      } else {
        // Formato Simple: Solo agregamos A vs B una vez
        if (i < j) {
          emparejamientosTotales.push({
            id: `${equiposCategoria[i].id}-${equiposCategoria[j].id}`,
            local: equiposCategoria[i],
            visitante: equiposCategoria[j]
          });
        }
      }
    }
  }

  // Filtrar los partidos existentes de la categoría activa
  const partidosCategoria = partidosTemporada.filter(p => p.categoria === categoriaActiva);

  // Clasificadores oficiales
  const pendientes: any[] = [];
  const programados: any[] = [];
  const jugados: any[] = [];

  // Copia mutable para ir descontando enfrentamientos
  const partidosDisponibles = [...partidosCategoria];

  emparejamientosTotales.forEach(emp => {
    let indexExistente = -1;

    if (isDobleRonda) {
      // En ida y vuelta, buscamos exactamente la misma localía
      indexExistente = partidosDisponibles.findIndex(p => 
        p.equipo_local_id === emp.local.id && p.equipo_visitante_id === emp.visitante.id
      );
    } else {
      // En ronda simple, el partido cuenta sin importar quién sea local
      indexExistente = partidosDisponibles.findIndex(p => 
        (p.equipo_local_id === emp.local.id && p.equipo_visitante_id === emp.visitante.id) ||
        (p.equipo_local_id === emp.visitante.id && p.equipo_visitante_id === emp.local.id)
      );
    }

    if (indexExistente !== -1) {
      // El partido ya existe en la BD
      const partidoExistente = partidosDisponibles[indexExistente];
      partidosDisponibles.splice(indexExistente, 1); // Lo descontamos de la lista
      
      if (partidoExistente.estado === 'finalizado') {
        jugados.push(partidoExistente);
      } else {
        programados.push(partidoExistente); // Incluye 'programado', 'en curso' y 'suspendido'
      }
    } else {
      // Falta por agendar
      pendientes.push(emp);
    }
  });

  // 🏀 FUNCIONES DE ACCIÓN

  const actualizarBorrador = (id: string, campo: string, valor: string) => {
    setDrafts((prev: any) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor
      }
    }));
  };

  const agendarPartido = async (emparejamiento: any) => {
    const draft = borradores[emparejamiento.id];
    
    if (!draft || !draft.fecha || !draft.hora || !draft.lugar) {
      alert("⚠️ Falta técnica: Debes asignar Fecha, Hora y Lugar antes de agendar.");
      return;
    }

    const confirmar = window.confirm(`¿Agendar ${emparejamiento.local.nombre} vs ${emparejamiento.visitante.nombre} para el ${draft.fecha}?`);
    if (!confirmar) return;

    const nuevoPartido = {
      equipo_local_id: emparejamiento.local.id,
      equipo_visitante_id: emparejamiento.visitante.id,
      categoria: categoriaActiva,
      fecha: draft.fecha,
      hora: draft.hora,
      lugar: draft.lugar,
      estado: 'programado',
      fase_torneo: 'Temporada Regular',
      puntos_local: 0,
      puntos_visitante: 0
    };

    const { error } = await supabase.from('partidos').insert([nuevoPartido]);

    if (error) {
      alert(`❌ Error técnico: ${error.message}`);
    } else {
      alert("✅ ¡Partido agendado con éxito!");
      setDrafts((prev: any) => {
        const nuevos = { ...prev };
        delete nuevos[emparejamiento.id];
        return nuevos;
      });
      cargarDatos();
    }
  };

  return (
    <main className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight">
          Generador de Temporada Regular
        </h1>
        <p className="text-gray-500 font-bold mt-2">
          Programa los cruces automáticos de la liga.
        </p>
      </div>

      {/* Selector de Categorías */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 justify-center scrollbar-hide">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-6 py-2 rounded-full font-black text-sm uppercase tracking-wider transition-all whitespace-nowrap ${
              categoriaActiva === cat
                ? "bg-blue-600 text-white shadow-md scale-105"
                : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* REPORTE DE FORMATO DE LA CATEGORÍA */}
      <div className="text-center mb-8">
        <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border ${
          isDobleRonda ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-gray-100 text-gray-800 border-gray-200'
        }`}>
          {isDobleRonda ? '🔁 Formato: Ida y Vuelta (Doble Ronda)' : '▶️ Formato: Todos contra Todos (Ronda Simple)'}
        </span>
      </div>

      {cargando ? (
        <div className="text-center py-20 font-bold text-gray-500">Calculando matriz de enfrentamientos...</div>
      ) : equiposCategoria.length < 2 ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center font-bold">
          ⚠️ No hay suficientes equipos registrados en la categoría {categoriaActiva} para generar una temporada.
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          
          {/* 📊 PANEL DE MÉTRICAS (DASHBOARD) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-yellow-800 font-black text-[10px] uppercase tracking-widest">Faltan por Agendar</span>
              <span className="text-4xl font-black text-yellow-600">{pendientes.length}</span>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-blue-800 font-black text-[10px] uppercase tracking-widest">Programados</span>
              <span className="text-4xl font-black text-blue-600">{programados.length}</span>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-green-800 font-black text-[10px] uppercase tracking-widest">Ya Disputados</span>
              <span className="text-4xl font-black text-green-600">{jugados.length}</span>
            </div>
          </div>
          
          {/* SECCIÓN 1: EMPAREJAMIENTOS PENDIENTES */}
          <div>
            <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-900 pb-2">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide">
                Pendientes por Agendar
              </h2>
            </div>

            {pendientes.length === 0 ? (
              <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-xl text-center font-bold">
                ✅ ¡Todo listo! Todos los cruces de la Temporada Regular en {categoriaActiva} ya tienen fecha.
              </div>
            ) : (
              <div className="grid gap-4">
                {pendientes.map((emp) => (
                  <div key={emp.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 flex flex-col lg:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-shadow">
                    
                    {/* Visual del Partido */}
                    <div className="flex items-center justify-between w-full lg:w-1/3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex flex-col items-center gap-1 w-2/5">
                        <span className="font-black text-gray-900 text-xs text-center uppercase truncate w-full">{emp.local.nombre}</span>
                      </div>
                      <span className="text-gray-400 font-black text-[10px] w-1/5 text-center">VS</span>
                      <div className="flex flex-col items-center gap-1 w-2/5">
                        <span className="font-black text-gray-900 text-xs text-center uppercase truncate w-full">{emp.visitante.nombre}</span>
                      </div>
                    </div>

                    {/* Controles de Agendamiento */}
                    <div className="flex flex-col md:flex-row w-full lg:w-2/3 gap-3">
                      <input 
                        type="date" 
                        className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={borradores[emp.id]?.fecha || ''}
                        onChange={(e) => actualizarBorrador(emp.id, 'fecha', e.target.value)}
                      />
                      <input 
                        type="time" 
                        className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={borradores[emp.id]?.hora || ''}
                        onChange={(e) => actualizarBorrador(emp.id, 'hora', e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Cancha / Sede"
                        className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={borradores[emp.id]?.lugar || ''}
                        onChange={(e) => actualizarBorrador(emp.id, 'lugar', e.target.value)}
                      />
                      <button 
                        onClick={() => agendarPartido(emp)}
                        className="bg-gray-900 hover:bg-black text-white font-black px-6 py-2.5 rounded-lg uppercase tracking-wide text-xs transition-colors shadow-sm"
                      >
                        Agendar
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: EMPAREJAMIENTOS YA PROGRAMADOS */}
          {programados.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-200 pb-2 mt-8">
                <h2 className="text-xl font-black text-gray-600 uppercase tracking-wide">
                  Juegos Programados / En Curso
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-90">
                {programados.map((partido: any) => (
                  <div key={partido.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">{partido.fecha}</span>
                      
                      {partido.estado === 'suspendido' ? (
                        <span className="font-black text-[9px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded uppercase">Suspendido</span>
                      ) : partido.estado === 'en curso' ? (
                        <span className="font-black text-[9px] bg-red-200 text-red-800 px-2 py-0.5 rounded uppercase animate-pulse">En Curso</span>
                      ) : (
                        <span className="font-bold text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{partido.hora}</span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center px-2">
                      <span className="font-black text-gray-900 text-xs uppercase w-[40%] truncate text-left">{partido.local?.nombre}</span>
                      <span className="text-gray-400 font-black text-[10px] w-[20%] text-center">VS</span>
                      <span className="font-black text-gray-900 text-xs uppercase w-[40%] text-right truncate">{partido.visitante?.nombre}</span>
                    </div>

                    <div className="text-center pt-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">📍 {partido.lugar}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: JUEGOS YA DISPUTADOS */}
          {jugados.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-200 pb-2 mt-8">
                <h2 className="text-xl font-black text-gray-600 uppercase tracking-wide">
                  Juegos Ya Disputados
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                {jugados.map((partido: any) => (
                  <div key={partido.id} className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                      <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">{partido.fecha}</span>
                      <span className="font-black text-[9px] bg-green-200 text-green-900 px-2 py-0.5 rounded uppercase">Finalizado</span>
                    </div>
                    
                    <div className="flex justify-between items-center px-2">
                      <div className="flex flex-col items-center w-[40%]">
                        <span className="font-black text-gray-900 text-xs uppercase truncate w-full text-center">{partido.local?.nombre}</span>
                        <span className="text-xl font-black text-gray-900 mt-1">{partido.puntos_local}</span>
                      </div>
                      
                      <span className="text-gray-400 font-black text-[10px] w-[20%] text-center">-</span>
                      
                      <div className="flex flex-col items-center w-[40%]">
                        <span className="font-black text-gray-900 text-xs uppercase truncate w-full text-center">{partido.visitante?.nombre}</span>
                        <span className="text-xl font-black text-gray-900 mt-1">{partido.puntos_visitante}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </main>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function PanelEmparejamientos() {
  const CATEGORIAS = ["U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];
  
  const [categoriaActiva, setCategoriaActiva] = useState("U10");
  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidosTotales, setPartidosTotales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados para agendar nuevos partidos
  const [borradores, setDrafts] = useState<any>({});
  
  // Estado: Memoria para saber qué emparejamientos tienen la localía invertida
  const [equiposInvertidos, setEquiposInvertidos] = useState<{ [key: string]: boolean }>({});

  // Estados para REPROGRAMAR/EDITAR
  const [partidoEditando, setPartidoEditando] = useState<string | null>(null);
  const [datosEdicion, setDatosEdicion] = useState<{fecha: string, hora: string, lugar: string}>({fecha: '', hora: '', lugar: ''});

  const cargarDatos = async () => {
    setCargando(true);
    
    // 1. Traemos los equipos
    const { data: eqs } = await supabase.from('equipos').select('*').order('nombre');
    if (eqs) setEquipos(eqs);

    // 2. Traemos TODOS los partidos y los ordenamos cronológicamente desde la base de datos
    const { data: pts } = await supabase
      .from('partidos')
      .select('*, local:equipos!equipo_local_id(nombre, logo_url), visitante:equipos!equipo_visitante_id(nombre, logo_url)')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });
    
    if (pts) setPartidosTotales(pts);

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // 🏀 UTILIDADES DE FORMATO Y AGRUPACIÓN
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr || fechaStr === "Fecha por definir") return "Fecha por definir";
    const [year, month, day] = fechaStr.split('-');
    if (!year || !month || !day) return fechaStr;
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const nombreDia = diasSemana[dateObj.getDay()];
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const nombreMes = meses[parseInt(month, 10) - 1];
    return `${nombreDia}, ${day} de ${nombreMes} de ${year}`;
  };

  const formatearHora = (horaStr: string) => {
    if (!horaStr || horaStr === "Hora por definir") return "Hora por definir";
    let [h, m] = horaStr.split(':');
    if (!h || !m) return horaStr;
    let horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'PM' : 'AM';
    horaNum = horaNum % 12 || 12;
    return `${horaNum}:${m} ${ampm}`;
  };

  const agruparPartidos = (listaPartidos: any[]) => {
    return listaPartidos.reduce((acc: any, partido) => {
      const fecha = partido.fecha || "Fecha por definir";
      const sede = partido.lugar || "Sede por definir";
      if (!acc[fecha]) acc[fecha] = {};
      if (!acc[fecha][sede]) acc[fecha][sede] = [];
      acc[fecha][sede].push(partido);
      return acc;
    }, {});
  };

  // 🏀 MOTOR DE GENERACIÓN Y LECTURA DIRECTA
  
  const equiposCategoria = equipos.filter(e => {
    if (Array.isArray(e.categorias)) return e.categorias.includes(categoriaActiva);
    return e.categoria === categoriaActiva;
  });

  const isDobleRonda = categoriaActiva === "U16 Femenino" || categoriaActiva === "U16 Masculino";
  
  const partidosCategoria = partidosTotales.filter(p => p.categoria === categoriaActiva);

  const programados = partidosCategoria.filter(p => p.estado !== 'finalizado');
  const jugados = partidosCategoria.filter(p => p.estado === 'finalizado');

  // Agrupamos las listas para la vista visual
  const programadosAgrupados = agruparPartidos(programados);
  const jugadosAgrupados = agruparPartidos(jugados);

  const emparejamientosIdeales = [];
  for (let i = 0; i < equiposCategoria.length; i++) {
    for (let j = 0; j < equiposCategoria.length; j++) {
      if (i === j) continue; 
      if (isDobleRonda) {
        emparejamientosIdeales.push({
          id: `${equiposCategoria[i].id}-${equiposCategoria[j].id}`,
          local: equiposCategoria[i],
          visitante: equiposCategoria[j]
        });
      } else if (i < j) {
        emparejamientosIdeales.push({
          id: `${equiposCategoria[i].id}-${equiposCategoria[j].id}`,
          local: equiposCategoria[i],
          visitante: equiposCategoria[j]
        });
      }
    }
  }

  const pendientes: any[] = [];
  const partidosParaDescontar = [...partidosCategoria];

  emparejamientosIdeales.forEach(emp => {
    let indexExistente = -1;

    if (isDobleRonda) {
      indexExistente = partidosParaDescontar.findIndex(p => 
        p.equipo_local_id === emp.local.id && p.equipo_visitante_id === emp.visitante.id
      );
    } else {
      indexExistente = partidosParaDescontar.findIndex(p => 
        (p.equipo_local_id === emp.local.id && p.equipo_visitante_id === emp.visitante.id) ||
        (p.equipo_local_id === emp.visitante.id && p.equipo_visitante_id === emp.local.id)
      );
    }

    if (indexExistente !== -1) {
      partidosParaDescontar.splice(indexExistente, 1);
    } else {
      pendientes.push(emp);
    }
  });

  // 🏀 FUNCIONES DE ACCIÓN: NUEVOS PARTIDOS

  const actualizarBorrador = (id: string, campo: string, valor: string) => {
    setDrafts((prev: any) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor
      }
    }));
  };

  const invertirLocalia = (id: string) => {
    setEquiposInvertidos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const agendarPartido = async (emparejamiento: any) => {
    const draft = borradores[emparejamiento.id];
    
    if (!draft || !draft.fecha || !draft.hora || !draft.lugar) {
      alert("⚠️ Falta técnica: Debes asignar Fecha, Hora y Lugar antes de agendar.");
      return;
    }

    const isInvertido = equiposInvertidos[emparejamiento.id];
    const equipoLocalDefinitivo = isInvertido ? emparejamiento.visitante : emparejamiento.local;
    const equipoVisitanteDefinitivo = isInvertido ? emparejamiento.local : emparejamiento.visitante;

    const confirmar = window.confirm(`¿Agendar ${equipoLocalDefinitivo.nombre} (Local) vs ${equipoVisitanteDefinitivo.nombre} (Visita) para el ${draft.fecha}?`);
    if (!confirmar) return;

    const nuevoPartido = {
      equipo_local_id: equipoLocalDefinitivo.id,
      equipo_visitante_id: equipoVisitanteDefinitivo.id,
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
      setEquiposInvertidos((prev: any) => {
        const nuevos = { ...prev };
        delete nuevos[emparejamiento.id];
        return nuevos;
      });
      cargarDatos();
    }
  };

  // 🏀 FUNCIONES DE ACCIÓN: EDITAR Y ELIMINAR PARTIDOS EXISTENTES

  const iniciarEdicion = (partido: any) => {
    setPartidoEditando(partido.id);
    setDatosEdicion({
      fecha: partido.fecha || '',
      hora: partido.hora || '',
      lugar: partido.lugar || ''
    });
  };

  const cancelarEdicion = () => {
    setPartidoEditando(null);
    setDatosEdicion({fecha: '', hora: '', lugar: ''});
  };

  const guardarEdicion = async (id: string) => {
    if (!datosEdicion.fecha || !datosEdicion.hora || !datosEdicion.lugar) {
      alert("⚠️ Debes completar la fecha, la hora y la sede.");
      return;
    }

    const { error } = await supabase
      .from('partidos')
      .update({
        fecha: datosEdicion.fecha,
        hora: datosEdicion.hora,
        lugar: datosEdicion.lugar
      })
      .eq('id', id);

    if (error) {
      alert(`❌ Error al reprogramar el partido: ${error.message}`);
    } else {
      alert("✅ Partido actualizado y reprogramado correctamente.");
      setPartidoEditando(null);
      cargarDatos();
    }
  };

  const eliminarPartido = async (id: string) => {
    const confirmar = window.confirm("⚠️ ¿Estás seguro de que deseas ELIMINAR este partido? Volverá a la lista de pendientes por agendar.");
    if (!confirmar) return;

    const { error } = await supabase.from('partidos').delete().eq('id', id);

    if (error) {
      alert(`❌ Error al eliminar el partido: ${error.message}`);
    } else {
      alert("🗑️ Partido eliminado correctamente.");
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
              <span className="text-blue-800 font-black text-[10px] uppercase tracking-widest">Ya Programados</span>
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
                ✅ ¡Todo listo! Todos los cruces ideales de la Temporada Regular en {categoriaActiva} ya existen en el sistema.
              </div>
            ) : (
              <div className="grid gap-4">
                {pendientes.map((emp) => {
                  const isInvertido = equiposInvertidos[emp.id] || false;
                  const localMostrar = isInvertido ? emp.visitante : emp.local;
                  const visitanteMostrar = isInvertido ? emp.local : emp.visitante;

                  return (
                    <div key={emp.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 flex flex-col lg:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-shadow">
                      
                      {/* Visual del Partido */}
                      <div className="flex items-center justify-between w-full lg:w-1/3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex flex-col items-center gap-1 w-2/5">
                          <span className="text-[8px] text-gray-400 font-black uppercase">Local</span>
                          <span className="font-black text-gray-900 text-xs text-center uppercase truncate w-full">{localMostrar.nombre}</span>
                        </div>
                        
                        <button 
                          onClick={() => invertirLocalia(emp.id)}
                          className="text-gray-400 hover:text-blue-600 font-black text-lg w-1/5 text-center transition-transform hover:scale-110 active:scale-95"
                          title="Intercambiar Local y Visitante"
                        >
                          🔄
                        </button>
                        
                        <div className="flex flex-col items-center gap-1 w-2/5">
                          <span className="text-[8px] text-gray-400 font-black uppercase">Visita</span>
                          <span className="font-black text-gray-900 text-xs text-center uppercase truncate w-full">{visitanteMostrar.nombre}</span>
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
                  );
                })}
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

              <div className="flex flex-col gap-8 opacity-95">
                {Object.entries(programadosAgrupados).map(([fecha, sedes]: [string, any]) => (
                  <div key={fecha} className="flex flex-col gap-4 border-b border-gray-100 pb-6 last:border-0">
                    <h3 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2">
                      📅 <span>{formatearFecha(fecha)}</span>
                    </h3>
                    
                    <div className="flex flex-col gap-6 pl-2 md:pl-4">
                      {Object.entries(sedes).map(([sede, partidosSede]: [string, any]) => (
                        <div key={sede}>
                          <h4 className="font-bold text-gray-700 uppercase mb-3 flex items-center gap-2 text-sm">
                            📍 Sede: <span className="text-blue-600">{sede}</span>
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {partidosSede.map((partido: any) => (
                              <div key={partido.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow relative">
                                {/* Botones de Editar y Eliminar si está suspendido o programado */}
                                {(partido.estado === 'programado' || partido.estado === 'suspendido') && partidoEditando !== partido.id && (
                                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                                    <button 
                                      onClick={() => iniciarEdicion(partido)}
                                      className="text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 p-1.5 rounded-md transition-colors"
                                      title="Modificar partido"
                                    >
                                      ✏️
                                    </button>
                                    <button 
                                      onClick={() => eliminarPartido(partido.id)}
                                      className="text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                                      title="Eliminar partido"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}

                                {/* MODO EDICIÓN */}
                                {partidoEditando === partido.id ? (
                                  <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center px-2 bg-gray-50 p-2 rounded-lg border border-gray-200 mb-2">
                                      <span className="font-black text-gray-900 text-[10px] uppercase truncate text-left">{partido.local?.nombre}</span>
                                      <span className="text-gray-400 font-black text-[10px] text-center px-2">VS</span>
                                      <span className="font-black text-gray-900 text-[10px] uppercase text-right truncate">{partido.visitante?.nombre}</span>
                                    </div>
                                    <input type="date" className="border border-gray-300 rounded-md p-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500" value={datosEdicion.fecha} onChange={(e) => setDatosEdicion({...datosEdicion, fecha: e.target.value})} />
                                    <div className="flex gap-2">
                                      <input type="time" className="w-1/2 border border-gray-300 rounded-md p-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500" value={datosEdicion.hora} onChange={(e) => setDatosEdicion({...datosEdicion, hora: e.target.value})} />
                                      <input type="text" placeholder="Sede" className="w-1/2 border border-gray-300 rounded-md p-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500" value={datosEdicion.lugar} onChange={(e) => setDatosEdicion({...datosEdicion, lugar: e.target.value})} />
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      <button onClick={cancelarEdicion} className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-black text-[10px] py-2 rounded-md uppercase">Cancelar</button>
                                      <button onClick={() => guardarEdicion(partido.id)} className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] py-2 rounded-md uppercase">Guardar</button>
                                    </div>
                                  </div>
                                ) : (
                                  /* MODO VISTA NORMAL */
                                  <>
                                    <div className="flex justify-between items-center border-b border-gray-200 pb-2 pr-12">
                                      <span className="font-bold text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{formatearHora(partido.hora)}</span>
                                      
                                      {partido.estado === 'suspendido' ? (
                                        <span className="font-black text-[9px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded uppercase">Suspendido</span>
                                      ) : partido.estado === 'en curso' ? (
                                        <span className="font-black text-[9px] bg-red-200 text-red-800 px-2 py-0.5 rounded uppercase animate-pulse">En Curso</span>
                                      ) : null}
                                    </div>
                                    
                                    <div className="flex justify-between items-center px-2 mt-1">
                                      <span className="font-black text-gray-900 text-xs uppercase w-[40%] truncate text-left">{partido.local?.nombre}</span>
                                      <span className="text-gray-400 font-black text-[10px] w-[20%] text-center">VS</span>
                                      <span className="font-black text-gray-900 text-xs uppercase w-[40%] text-right truncate">{partido.visitante?.nombre}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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

              <div className="flex flex-col gap-8 opacity-80">
                {Object.entries(jugadosAgrupados).map(([fecha, sedes]: [string, any]) => (
                  <div key={fecha} className="flex flex-col gap-4 border-b border-gray-200 pb-6 last:border-0">
                    <h3 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2">
                      📅 <span>{formatearFecha(fecha)}</span>
                    </h3>
                    
                    <div className="flex flex-col gap-6 pl-2 md:pl-4">
                      {Object.entries(sedes).map(([sede, partidosSede]: [string, any]) => (
                        <div key={sede}>
                          <h4 className="font-bold text-gray-700 uppercase mb-3 flex items-center gap-2 text-sm">
                            📍 Sede: <span className="text-blue-600">{sede}</span>
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {partidosSede.map((partido: any) => (
                              <div key={partido.id} className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                                  <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">{formatearHora(partido.hora)}</span>
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
                      ))}
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
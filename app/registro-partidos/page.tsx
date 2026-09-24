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

  // 🏀 MÉTRICAS GLOBALES DE LA LIGA
  const globalJugados = partidosTotales.filter(p => p.estado === 'finalizado').length;
  const globalPorJugar = partidosTotales.filter(p => p.estado !== 'finalizado').length;
  const globalTotal = partidosTotales.length;
  const globalBorradores = partidosTotales.filter(p => p.estado === 'borrador').length;
  
  let globalPorAgendar = 0;
  CATEGORIAS.forEach(cat => {
    const equiposCat = equipos.filter(e => {
      if (Array.isArray(e.categorias)) return e.categorias.includes(cat);
      return e.categoria === cat;
    });
    const isDoble = cat === "U16 Femenino" || cat === "U16 Masculino";
    const partidosCat = partidosTotales.filter(p => p.categoria === cat);
    const paraDescontar = [...partidosCat];
    
    for (let i = 0; i < equiposCat.length; i++) {
      for (let j = 0; j < equiposCat.length; j++) {
        if (i === j) continue;
        if (isDoble || i < j) {
          const idLocal = equiposCat[i].id;
          const idVisita = equiposCat[j].id;
          let idx = -1;
          
          if (isDoble) {
            idx = paraDescontar.findIndex(p => p.equipo_local_id === idLocal && p.equipo_visitante_id === idVisita);
          } else {
            idx = paraDescontar.findIndex(p => 
              (p.equipo_local_id === idLocal && p.equipo_visitante_id === idVisita) ||
              (p.equipo_local_id === idVisita && p.equipo_visitante_id === idLocal)
            );
          }
          
          if (idx !== -1) {
            paraDescontar.splice(idx, 1);
          } else {
            globalPorAgendar++;
          }
        }
      }
    }
  });

  // 🏀 MOTOR DE GENERACIÓN POR CATEGORÍA ACTIVA
  const equiposCategoria = categoriaActiva === "Todas" ? [] : equipos.filter(e => {
    if (Array.isArray(e.categorias)) return e.categorias.includes(categoriaActiva);
    return e.categoria === categoriaActiva;
  });

  const isDobleRonda = categoriaActiva === "U16 Femenino" || categoriaActiva === "U16 Masculino";
  
  const partidosCategoria = categoriaActiva === "Todas" 
    ? partidosTotales 
    : partidosTotales.filter(p => p.categoria === categoriaActiva);

  const programados = partidosCategoria.filter(p => p.estado !== 'finalizado');
  const jugados = partidosCategoria.filter(p => p.estado === 'finalizado');

  const programadosAgrupados = agruparPartidos(programados);
  const jugadosAgrupados = agruparPartidos(jugados);

  const emparejamientosIdeales = [];
  if (categoriaActiva !== "Todas") {
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
      estado: 'borrador',
      fase_torneo: 'Temporada Regular',
      puntos_local: 0,
      puntos_visitante: 0
    };

    const { error } = await supabase.from('partidos').insert([nuevoPartido]);

    if (error) {
      alert(`❌ Error técnico: ${error.message}`);
    } else {
      alert("✅ ¡Partido agendado en borrador con éxito!");
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

  const publicarCalendario = async () => {
    const confirmar = window.confirm("¿Estás seguro de que deseas PUBLICAR todo el calendario? Los partidos en borrador pasarán a estar programados públicamente.");
    if (!confirmar) return;

    const { error } = await supabase
      .from('partidos')
      .update({ estado: 'programado' })
      .eq('estado', 'borrador');

    if (error) {
      alert(`❌ Error al publicar: ${error.message}`);
    } else {
      alert("✅ ¡Calendario Oficial Publicado con éxito!");
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
    <main className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight">
          Generador de Temporada Regular
        </h1>
        <p className="text-gray-500 font-bold mt-2">
          Programa los cruces automáticos de la liga.
        </p>
      </div>

      {/* PANEL GLOBAL DE LA LIGA */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-8 shadow-lg text-white">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Visión Global de la Liga (Todas las Categorías)
          </h2>
          {globalBorradores > 0 && (
            <button 
              onClick={publicarCalendario}
              className="bg-green-600 hover:bg-green-700 text-white font-black px-4 py-2 rounded-lg text-xs uppercase tracking-wide shadow-md transition-colors animate-pulse"
            >
              Publicar Calendario ({globalBorradores} Borradores)
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap gap-y-6 justify-around items-center">

          
          <div className="flex flex-col items-center w-1/2 md:w-1/4 border-r border-gray-700">
            <span className="text-yellow-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest mb-1 px-2 text-center">Faltan por Agendar</span>
            <span className="text-3xl md:text-4xl font-black text-yellow-500">{globalPorAgendar}</span>
          </div>

          <div className="flex flex-col items-center w-1/2 md:w-1/4 md:border-r border-gray-700">
            <span className="text-gray-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest mb-1 px-2 text-center">Partidos Agendados</span>
            <span className="text-3xl md:text-4xl font-black text-white">{globalTotal}</span>
          </div>

          <div className="flex flex-col items-center w-1/2 md:w-1/4 border-r border-gray-700">
            <span className="text-blue-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest mb-1 px-2 text-center">Faltan por Jugar</span>
            <span className="text-3xl md:text-4xl font-black text-blue-500">{globalPorJugar}</span>
          </div>

          <div className="flex flex-col items-center w-1/2 md:w-1/4">
            <span className="text-green-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest mb-1 px-2 text-center">Ya Disputados</span>
            <span className="text-3xl md:text-4xl font-black text-green-500">{globalJugados}</span>
          </div>

        </div>
      </div>

      {/* Selector de Categorías */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 justify-center scrollbar-hide">
        {["Todas", ...CATEGORIAS].map((cat) => (
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
      {categoriaActiva !== "Todas" && (
        <div className="text-center mb-8">
          <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border ${
            isDobleRonda ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-gray-100 text-gray-800 border-gray-200'
          }`}>
            {isDobleRonda ? '🔁 Formato: Ida y Vuelta (Doble Ronda)' : '▶️ Formato: Todos contra Todos (Ronda Simple)'}
          </span>
        </div>
      )}

      {cargando ? (
        <div className="text-center py-20 font-bold text-gray-500">Calculando matriz de enfrentamientos...</div>
      ) : categoriaActiva !== "Todas" && equiposCategoria.length < 2 ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center font-bold">
          ⚠️ No hay suficientes equipos registrados en la categoría {categoriaActiva} para generar una temporada.
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          
          {/* 📊 PANEL DE MÉTRICAS (CATEGORÍA ACTIVA) */}
          <div className={`grid grid-cols-1 ${categoriaActiva === "Todas" ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
            {categoriaActiva !== "Todas" && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                <span className="text-yellow-800 font-black text-[10px] uppercase tracking-widest">Faltan por Agendar</span>
                <span className="text-4xl font-black text-yellow-600">{pendientes.length}</span>
              </div>
            )}
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
          {categoriaActiva !== "Todas" && (
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
                    <div key={emp.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 flex flex-col xl:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-shadow">
                      
                      {/* Visual del Partido */}
                      <div className="flex items-center justify-between w-full xl:w-[45%] bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex flex-col items-center gap-1.5 w-[42%]">
                          <span className="text-[8px] text-gray-400 font-black uppercase">Local</span>
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                            {localMostrar.logo_url ? (
                              <img src={localMostrar.logo_url} alt={localMostrar.nombre} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <span className="font-black text-gray-400 text-lg">{localMostrar.nombre?.charAt(0)}</span>
                            )}
                          </div>
                          <span className="font-black text-gray-900 text-[10px] md:text-xs text-center uppercase leading-tight">{localMostrar.nombre}</span>
                        </div>
                        
                        <button 
                          onClick={() => invertirLocalia(emp.id)}
                          className="text-gray-400 hover:text-blue-600 font-black text-xl w-[16%] text-center transition-transform hover:scale-110 active:scale-95"
                          title="Intercambiar Local y Visitante"
                        >
                          🔄
                        </button>
                        
                        <div className="flex flex-col items-center gap-1.5 w-[42%]">
                          <span className="text-[8px] text-gray-400 font-black uppercase">Visita</span>
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                            {visitanteMostrar.logo_url ? (
                              <img src={visitanteMostrar.logo_url} alt={visitanteMostrar.nombre} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <span className="font-black text-gray-400 text-lg">{visitanteMostrar.nombre?.charAt(0)}</span>
                            )}
                          </div>
                          <span className="font-black text-gray-900 text-[10px] md:text-xs text-center uppercase leading-tight">{visitanteMostrar.nombre}</span>
                        </div>
                      </div>

                      {/* Controles de Agendamiento */}
                      <div className="w-full xl:w-[55%] flex flex-col sm:flex-row flex-wrap items-stretch gap-2">
                        <input 
                          type="date" 
                          className="flex-1 min-w-[130px] border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={borradores[emp.id]?.fecha || ''}
                          onChange={(e) => actualizarBorrador(emp.id, 'fecha', e.target.value)}
                        />
                        <input 
                          type="time" 
                          className="flex-1 min-w-[100px] border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={borradores[emp.id]?.hora || ''}
                          onChange={(e) => actualizarBorrador(emp.id, 'hora', e.target.value)}
                        />
                        <input 
                          type="text" 
                          placeholder="Cancha / Sede"
                          className="flex-1 min-w-[130px] border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={borradores[emp.id]?.lugar || ''}
                          onChange={(e) => actualizarBorrador(emp.id, 'lugar', e.target.value)}
                        />
                        <button 
                          onClick={() => agendarPartido(emp)}
                          className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white font-black px-6 py-2.5 rounded-lg uppercase tracking-wide text-xs transition-colors shadow-sm shrink-0"
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
          )}

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
                          <h4 className="font-bold text-gray-700 uppercase mb-3 flex items-center flex-wrap gap-2 text-sm">
                            📍 Sede: <span className="text-blue-600">{sede}</span>
                            <span className="text-gray-300 text-xs hidden md:inline-block">|</span>
                            <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-md tracking-normal">📅 {formatearFecha(fecha)}</span>
                          </h4>
                          
                          <div className="flex flex-col gap-3 md:gap-6 mt-1">
                            {partidosSede.map((partido: any) => (
                              <div key={partido.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative">

                                {/* MODO EDICIÓN */}
                                {partidoEditando === partido.id ? (
                                  <div className="flex flex-col gap-3 p-4">
                                    <div className="flex justify-between items-center px-2 bg-gray-50 p-2 rounded-lg border border-gray-200 mb-2">
                                      <span className="font-black text-gray-900 text-[10px] uppercase truncate text-left w-[40%]">{partido.local?.nombre}</span>
                                      <span className="text-gray-400 font-black text-[10px] text-center w-[20%]">VS</span>
                                      <span className="font-black text-gray-900 text-[10px] uppercase text-right truncate w-[40%]">{partido.visitante?.nombre}</span>
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
                                    <div className="bg-gray-50 px-3 py-2 md:px-6 md:py-3 border-b border-gray-200 flex justify-between items-center text-center sm:text-left">
                                      <span className="font-black text-blue-600 text-[11px] md:text-sm tracking-wide shrink-0">
                                        ⏱️ {formatearHora(partido.hora)}
                                      </span>
                                      
                                      <div className="flex gap-2 items-center justify-end flex-wrap">
                                        {partido.estado === 'suspendido' ? (
                                          <span className="font-black text-[9px] md:text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase shadow-sm">Suspendido</span>
                                        ) : partido.estado === 'en curso' ? (
                                          <span className="font-black text-[9px] md:text-xs bg-red-200 text-red-800 px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase animate-pulse shadow-sm flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> En Curso</span>
                                        ) : partido.estado === 'borrador' ? (
                                          <span className="font-black text-[9px] md:text-xs bg-gray-200 text-gray-800 px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase shadow-sm">Borrador</span>
                                        ) : (
                                          <span className="font-black text-[9px] md:text-xs bg-blue-50 text-blue-600 px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase border border-blue-200">Programado</span>
                                        )}
                                        
                                        {(partido.estado === 'programado' || partido.estado === 'suspendido' || partido.estado === 'borrador') && (
                                          <div className="flex gap-1 ml-1 sm:ml-2 border-l border-gray-300 pl-1 sm:pl-2">
                                            <button 
                                              onClick={() => iniciarEdicion(partido)}
                                              className="text-gray-400 hover:text-blue-600 bg-white hover:bg-blue-50 p-1 md:p-1.5 rounded-md transition-colors border border-gray-200 shadow-sm"
                                              title="Modificar partido"
                                            >
                                              ✏️
                                            </button>
                                            <button 
                                              onClick={() => eliminarPartido(partido.id)}
                                              className="text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 p-1 md:p-1.5 rounded-md transition-colors border border-gray-200 shadow-sm"
                                              title="Eliminar partido"
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="px-2 pt-3 pb-6 md:px-6 md:pt-6 md:pb-10 grid grid-cols-3 items-start w-full gap-1 md:gap-2">
                                      <div className="flex flex-col items-center gap-1 md:gap-3">
                                        <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0 overflow-hidden shadow-sm">
                                          {partido.local?.logo_url ? <img src={partido.local.logo_url} alt={partido.local?.nombre} className="w-full h-full object-contain p-1" /> : <span className="text-gray-300 font-black text-lg md:text-2xl">{partido.local?.nombre?.charAt(0) || 'L'}</span>}
                                        </div>
                                        <span className="font-bold text-gray-900 text-[9px] sm:text-sm md:text-base text-center uppercase leading-snug px-0.5">{partido.local?.nombre}</span>
                                      </div>
                                      
                                      <div className="flex flex-col items-center justify-start pt-2 md:pt-6">
                                        <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-200">VS</span>
                                      </div>
                                      
                                      <div className="flex flex-col items-center gap-1 md:gap-3">
                                        <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0 overflow-hidden shadow-sm">
                                          {partido.visitante?.logo_url ? <img src={partido.visitante.logo_url} alt={partido.visitante?.nombre} className="w-full h-full object-contain p-1" /> : <span className="text-gray-300 font-black text-lg md:text-2xl">{partido.visitante?.nombre?.charAt(0) || 'V'}</span>}
                                        </div>
                                        <span className="font-bold text-gray-900 text-[9px] sm:text-sm md:text-base text-center uppercase leading-snug px-0.5">{partido.visitante?.nombre}</span>
                                      </div>
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
                          <h4 className="font-bold text-gray-700 uppercase mb-3 flex items-center flex-wrap gap-2 text-sm">
                            📍 Sede: <span className="text-blue-600">{sede}</span>
                            <span className="text-gray-300 text-xs hidden md:inline-block">|</span>
                            <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-md tracking-normal">📅 {formatearFecha(fecha)}</span>
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {partidosSede.map((partido: any) => (
                              <div key={partido.id} className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                                  <span className="font-bold text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{formatearHora(partido.hora)}</span>
                                  <span className="font-black text-[9px] bg-green-200 text-green-900 px-2 py-0.5 rounded uppercase">Finalizado</span>
                                </div>
                                
                                <div className="flex justify-between items-center px-1 mt-2">
                                  <div className="flex flex-col items-center w-[40%] gap-1">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-300 shadow-sm">
                                      {partido.local?.logo_url ? <img src={partido.local.logo_url} alt={partido.local?.nombre} className="w-full h-full object-contain p-0.5" /> : <span className="font-black text-gray-400 text-xs">{partido.local?.nombre?.charAt(0)}</span>}
                                    </div>
                                    <span className="font-black text-gray-900 text-[9px] md:text-[10px] text-center uppercase leading-tight">{partido.local?.nombre}</span>
                                    <span className="text-xl font-black text-gray-900 mt-1 bg-white px-3 py-0.5 rounded-md border border-gray-200">{partido.puntos_local}</span>
                                  </div>
                                  
                                  <span className="text-gray-400 font-black text-[10px] w-[20%] text-center">-</span>
                                  
                                  <div className="flex flex-col items-center w-[40%] gap-1">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-300 shadow-sm">
                                      {partido.visitante?.logo_url ? <img src={partido.visitante.logo_url} alt={partido.visitante?.nombre} className="w-full h-full object-contain p-0.5" /> : <span className="font-black text-gray-400 text-xs">{partido.visitante?.nombre?.charAt(0)}</span>}
                                    </div>
                                    <span className="font-black text-gray-900 text-[9px] md:text-[10px] text-center uppercase leading-tight">{partido.visitante?.nombre}</span>
                                    <span className="text-xl font-black text-gray-900 mt-1 bg-white px-3 py-0.5 rounded-md border border-gray-200">{partido.puntos_visitante}</span>
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
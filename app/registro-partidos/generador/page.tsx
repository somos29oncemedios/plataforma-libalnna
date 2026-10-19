'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/supabase';
import { toPng } from 'html-to-image';
import { obtenerLimiteClasificados } from '@/lib/categorias';

export default function GeneradorGraficas() {
  // Pestaña activa: 'calendario' o 'posiciones'
  const [modo, setModo] = useState<'calendario' | 'posiciones'>('posiciones');

  // ==========================================
  // ESTADOS DEL MODO CALENDARIO DE PARTIDOS
  // ==========================================
  const [partidos, setPartidos] = useState<any[]>([]);
  const [fechas, setFechas] = useState<string[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [fondoUrl, setFondoUrl] = useState('/fondo-amarillo.png');
  const graficaRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // ESTADOS DEL MODO TABLA DE POSICIONES
  // ==========================================
  const CATEGORIAS = ["U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];
  const [categoriaPosiciones, setCategoriaPosiciones] = useState(CATEGORIAS[1]); // Default U10
  const [formatoPosiciones, setFormatoPosiciones] = useState<'1080x1920' | '1080x1440'>('1080x1920');
  const [fondoPosiciones, setFondoPosiciones] = useState<string>('dark_premium');
  const [tituloFase, setTituloFase] = useState('TEMPORADA REGULAR 2026');
  const [limiteClasificados, setLimiteClasificados] = useState<number>(obtenerLimiteClasificados(CATEGORIAS[1]));
  const [tablaPosiciones, setTablaPosiciones] = useState<any[]>([]);
  const [cargandoPosiciones, setCargandoPosiciones] = useState(false);
  const graficaPosicionesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarPartidos();
  }, []);

  useEffect(() => {
    if (modo === 'posiciones') {
      cargarPosiciones(categoriaPosiciones);
      setLimiteClasificados(obtenerLimiteClasificados(categoriaPosiciones));
    }
  }, [modo, categoriaPosiciones]);

  // Carga para Calendario
  const cargarPartidos = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('partidos')
      .select(`
        *,
        local:equipos!equipo_local_id(nombre, logo_url),
        visitante:equipos!equipo_visitante_id(nombre, logo_url)
      `)
      .neq('estado', 'finalizado')
      .neq('estado', 'suspendido')
      .order('hora', { ascending: true });

    if (data) {
      setPartidos(data);
      const fechasUnicas = Array.from(new Set(data.map(p => p.fecha).filter(Boolean))) as string[];
      fechasUnicas.sort();
      setFechas(fechasUnicas);
      
      if (fechasUnicas.length > 0) {
        const primeraFecha = fechasUnicas[0];
        setFechaSeleccionada(primeraFecha);
        const sedesDePrimeraFecha = Array.from(new Set(data.filter(p => p.fecha === primeraFecha).map(p => p.lugar).filter(Boolean))) as string[];
        if (sedesDePrimeraFecha.length > 0) {
          setSedeSeleccionada(sedesDePrimeraFecha[0]);
        }
      }
    }
    setCargando(false);
  };

  // Carga para Tabla de Posiciones
  const cargarPosiciones = async (categoria: string) => {
    setCargandoPosiciones(true);
    
    // 1. Obtener equipos
    const { data: equiposData } = await supabase.from('equipos').select('*');
    const equiposFiltrados = equiposData?.filter(eq => 
      eq.categorias && eq.categorias.includes(categoria)
    ) || [];

    // 2. Obtener partidos finalizados de esta categoría
    const { data: partidosData } = await supabase
      .from('partidos')
      .select('*')
      .eq('categoria', categoria)
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

    if (partidosData) {
      partidosData.forEach(partido => {
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

          const tipo = partido.tipo_cierre || 'normal';

          if (tipo === 'forfeit_local') {
            visitante.jg += 1;
            visitante.pts += 2;
            local.jp += 1;
            local.pts += 0;
          } else if (tipo === 'forfeit_visitante') {
            local.jg += 1;
            local.pts += 2;
            visitante.jp += 1;
            visitante.pts += 0;
          } else if (tipo === 'doble_forfeit') {
            local.jp += 1;
            local.pts += 0;
            visitante.jp += 1;
            visitante.pts += 0;
          } else if (tipo === 'mesa_local') {
            visitante.jg += 1;
            visitante.pts += 2;
            local.jp += 1;
            local.pts += 0;
          } else if (tipo === 'mesa_visitante') {
            local.jg += 1;
            local.pts += 2;
            visitante.jp += 1;
            visitante.pts += 0;
          } else if (tipo === 'default_local') {
            visitante.jg += 1;
            visitante.pts += 2;
            local.jp += 1;
            local.pts += 1;
          } else if (tipo === 'default_visitante') {
            local.jg += 1;
            local.pts += 2;
            visitante.jp += 1;
            visitante.pts += 1;
          } else {
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
            } else {
              local.pts += 1;
              visitante.pts += 1;
            }
          }
        }
      });
    }

    const tabla = Object.values(stats).sort((a: any, b: any) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const difA = a.pf - a.pc;
      const difB = b.pf - b.pc;
      if (difB !== difA) return difB - difA;
      return b.pf - a.pf;
    });

    setTablaPosiciones(tabla);
    setCargandoPosiciones(false);
  };

  const manejarCambioFecha = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaFecha = e.target.value;
    setFechaSeleccionada(nuevaFecha);
    const sedesDeNuevaFecha = Array.from(new Set(partidos.filter(p => p.fecha === nuevaFecha).map(p => p.lugar).filter(Boolean))) as string[];
    if (sedesDeNuevaFecha.length > 0) {
      setSedeSeleccionada(sedesDeNuevaFecha[0]);
    } else {
      setSedeSeleccionada('');
    }
  };

  const formatearFechaParaSelect = (fechaStr: string) => {
    if (!fechaStr) return "";
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatearFechaCabecera = (fechaStr: string) => {
    if (!fechaStr) return "";
    const [year, month, day] = fechaStr.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
    const nombreDia = diasSemana[dateObj.getDay()];
    const yearCorto = year.substring(2);
    return `${nombreDia} ${day}/${month}/${yearCorto}`;
  };

  const formatearHora = (horaStr: string) => {
    if (!horaStr) return "";
    let [h, m] = horaStr.split(':');
    let horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'PM' : 'AM';
    horaNum = horaNum % 12 || 12;
    return `${horaNum}:${m} ${ampm}`;
  };

  const descargarImagenCalendario = async () => {
    if (graficaRef.current === null) return;
    setGenerando(true);
    try {
      const dataUrl = await toPng(graficaRef.current, { 
        cacheBust: true,
        quality: 1,
        pixelRatio: 1
      });
      const link = document.createElement('a');
      link.download = `Juegos_${sedeSeleccionada}_${fechaSeleccionada}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al generar la imagen', err);
      alert('Hubo un error al generar la gráfica.');
    } finally {
      setGenerando(false);
    }
  };

  const descargarImagenPosiciones = async () => {
    if (graficaPosicionesRef.current === null) return;
    setGenerando(true);
    try {
      const dataUrl = await toPng(graficaPosicionesRef.current, { 
        cacheBust: true,
        quality: 1,
        pixelRatio: 1
      });
      const link = document.createElement('a');
      link.download = `Tabla_Posiciones_${categoriaPosiciones.replace(/\s+/g, '_')}_${formatoPosiciones}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al generar la imagen de posiciones', err);
      alert('Hubo un error al generar la gráfica de la tabla.');
    } finally {
      setGenerando(false);
    }
  };

  const sedesDisponibles = Array.from(new Set(partidos.filter(p => p.fecha === fechaSeleccionada).map(p => p.lugar).filter(Boolean))) as string[];
  const partidosAMostrar = partidos.filter(p => p.fecha === fechaSeleccionada && p.lugar === sedeSeleccionada);

  const esStory = formatoPosiciones === '1080x1920';

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <link href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@700&family=Montserrat:wght@800;900&display=swap" rel="stylesheet" />

      {/* ENCABEZADO Y SELECTOR DE PESTAÑAS */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
              Generador de Gráficas para Instagram
            </h1>
            <p className="text-gray-500 font-bold text-sm">
              Crea imágenes oficiales listas para publicar en historias y feed.
            </p>
          </div>
          <a href="/registro-partidos" className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-black px-4 py-2 rounded-xl transition-colors">
            ← Volver al Panel
          </a>
        </div>

        {/* SELECTOR DE PESTAÑAS */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200">
          <button
            onClick={() => setModo('calendario')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              modo === 'calendario'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>📅</span> Calendario de Juegos
          </button>
          <button
            onClick={() => setModo('posiciones')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              modo === 'posiciones'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>🏆</span> Tabla de Posiciones
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* ==================================================== */}
        {/* PANEL DE CONTROLES (IZQUIERDA)                      */}
        {/* ==================================================== */}
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-fit">
          
          {modo === 'calendario' ? (
            /* CONTROLES PARA CALENDARIO */
            <>
              <h2 className="text-lg font-black text-gray-900 mb-4 uppercase border-b pb-2">
                Ajustes de Partidos
              </h2>
              {cargando ? (
                <p className="text-gray-500 font-bold animate-pulse">Cargando fechas y partidos...</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 font-bold text-sm"
                      value={fechaSeleccionada}
                      onChange={manejarCambioFecha}
                    >
                      {fechas.map(f => <option key={f} value={f}>{formatearFechaParaSelect(f)}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sede (Cancha)</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 font-bold text-sm"
                      value={sedeSeleccionada}
                      onChange={(e) => setSedeSeleccionada(e.target.value)}
                    >
                      {sedesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Color del Fondo</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 font-bold text-sm"
                      value={fondoUrl}
                      onChange={(e) => setFondoUrl(e.target.value)}
                    >
                      <option value="/fondo-amarillo.png">🟡 Fondo Amarillo Oficial</option>
                      <option value="/fondo-azul.png">🔵 Fondo Azul Oficial</option>
                      <option value="/fondo-verde.png">🟢 Fondo Verde Oficial</option>
                    </select>
                  </div>

                  <div className="mt-2 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-xs text-blue-900 font-bold">
                      🏀 <strong>{partidosAMostrar.length}</strong> partidos programados para esta sede y día.
                    </p>
                    {partidosAMostrar.length > 5 && (
                      <p className="text-[11px] text-red-600 font-black mt-1">
                        ⚠️ Más de 5 partidos pueden verse amontonados.
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={descargarImagenCalendario}
                    disabled={generando || partidosAMostrar.length === 0}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black py-4 rounded-xl shadow-md uppercase transition-all flex justify-center items-center gap-2 text-sm"
                  >
                    {generando ? 'Generando PNG...' : '📥 Descargar Gráfica (PNG)'}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* CONTROLES PARA TABLA DE POSICIONES */
            <>
              <h2 className="text-lg font-black text-gray-900 mb-4 uppercase border-b pb-2 flex items-center justify-between">
                <span>Ajustes de Tabla</span>
                <span className="text-xs text-blue-600 font-bold">Resumida</span>
              </h2>

              <div className="flex flex-col gap-4">
                
                {/* Categoría */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Categoría</label>
                  <select 
                    className="w-full border-2 border-gray-300 focus:border-blue-500 rounded-xl p-2.5 font-bold text-sm outline-none"
                    value={categoriaPosiciones}
                    onChange={(e) => {
                      const nuevaCat = e.target.value;
                      setCategoriaPosiciones(nuevaCat);
                      setLimiteClasificados(obtenerLimiteClasificados(nuevaCat));
                    }}
                  >
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Formato de Imagen */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Formato para Instagram</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormatoPosiciones('1080x1920')}
                      className={`py-2.5 px-2 rounded-xl font-black text-xs uppercase border-2 transition-all flex flex-col items-center gap-1 ${
                        formatoPosiciones === '1080x1920'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-base">📱</span>
                      <span>Historia / Reel</span>
                      <span className="text-[10px] text-gray-400 font-semibold">1080 x 1920</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormatoPosiciones('1080x1440')}
                      className={`py-2.5 px-2 rounded-xl font-black text-xs uppercase border-2 transition-all flex flex-col items-center gap-1 ${
                        formatoPosiciones === '1080x1440'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-base">🖼️</span>
                      <span>Feed Retrato</span>
                      <span className="text-[10px] text-gray-400 font-semibold">1080 x 1440</span>
                    </button>
                  </div>
                </div>

                {/* Fondo Visual */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Estilo / Fondo</label>
                  <select 
                    className="w-full border-2 border-gray-300 focus:border-blue-500 rounded-xl p-2.5 font-bold text-sm outline-none"
                    value={fondoPosiciones}
                    onChange={(e) => setFondoPosiciones(e.target.value)}
                  >
                    <option value="dark_premium">🏀 Dark Mode Premium (Duela Azul Noche)</option>
                    <option value="/fondo-amarillo.png">🟡 Fondo Amarillo Oficial</option>
                    <option value="/fondo-azul.png">🔵 Fondo Azul Oficial</option>
                    <option value="/fondo-verde.png">🟢 Fondo Verde Oficial</option>
                  </select>
                </div>

                {/* Fase / Temporada */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Título de la Fase</label>
                  <input 
                    type="text"
                    className="w-full border-2 border-gray-300 focus:border-blue-500 rounded-xl p-2.5 font-bold text-sm outline-none uppercase"
                    value={tituloFase}
                    onChange={(e) => setTituloFase(e.target.value)}
                    placeholder="Ej: TEMPORADA REGULAR 2026"
                  />
                </div>

                {/* Línea de Clasificación a Playoffs */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Zona de Clasificación</label>
                  <select 
                    className="w-full border-2 border-gray-300 focus:border-blue-500 rounded-xl p-2.5 font-bold text-sm outline-none"
                    value={limiteClasificados}
                    onChange={(e) => setLimiteClasificados(parseInt(e.target.value, 10))}
                  >
                    <option value={8}>Top 8 (Clasifican a Cuartos de Final)</option>
                    <option value={6}>Top 6 (Clasifican a Playoffs)</option>
                    <option value={4}>Top 4 (Clasifican a Semifinales)</option>
                    <option value={0}>Sin línea divisoria</option>
                  </select>
                </div>

                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 font-bold flex justify-between items-center">
                  <span>Equipos cargados:</span>
                  <span className="text-blue-600 font-black text-sm">{tablaPosiciones.length}</span>
                </div>

                {/* Botón de Descarga */}
                <button 
                  onClick={descargarImagenPosiciones}
                  disabled={generando || tablaPosiciones.length === 0}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black py-4 rounded-xl shadow-lg uppercase transition-all flex justify-center items-center gap-2 text-sm tracking-wide"
                >
                  {generando ? 'Generando PNG...' : `📥 Descargar Tabla (${formatoPosiciones})`}
                </button>

              </div>
            </>
          )}

        </div>

        {/* ==================================================== */}
        {/* PREVIEW DEL LIENZO (DERECHA)                        */}
        {/* ==================================================== */}
        <div className="w-full lg:w-2/3 bg-gray-900/10 rounded-2xl overflow-hidden flex flex-col justify-center items-center relative border-4 border-dashed border-gray-300 min-h-[850px] p-4">
          
          <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-black z-20 shadow-md flex items-center gap-1.5">
            <span>👁️ Vista Previa</span>
            <span className="text-blue-400">({modo === 'calendario' ? '1080 x 1440 px' : `${formatoPosiciones} px`})</span>
          </div>

          {modo === 'calendario' ? (
            /* LIENZO DE CALENDARIO */
            <div style={{ transform: 'scale(0.5)', transformOrigin: 'center center' }} className="flex justify-center items-center my-auto">
              <div 
                ref={graficaRef}
                className="relative overflow-hidden shadow-2xl bg-gray-900 shrink-0"
                style={{ width: '1080px', height: '1440px', backgroundImage: `url(${fondoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                {/* Cinta rosa de fecha */}
                <div className="absolute top-[295px] left-[585px] -translate-x-1/2 z-20 w-full text-center">
                  <h2 className="text-[37px] text-white font-black uppercase tracking-widest leading-none" style={{ fontFamily: '"Oswald", sans-serif' }}>
                    {formatearFechaCabecera(fechaSeleccionada)}
                  </h2>
                </div>
                
                {/* Cancha */}
                <div className="absolute top-[357px] left-[585px] -translate-x-1/2 z-20 w-full text-center">
                  <span className="font-bold text-black text-[42px] tracking-tight">
                    {sedeSeleccionada ? (
                      sedeSeleccionada.toLowerCase().startsWith('cancha:')
                        ? sedeSeleccionada
                        : sedeSeleccionada.toLowerCase().startsWith('cancha ')
                          ? `Cancha: ${sedeSeleccionada.slice(7)}`
                          : `Cancha: ${sedeSeleccionada}`
                    ) : ''}
                  </span>
                </div>

                {/* LISTA DE PARTIDOS */}
                <div className="absolute top-[460px] left-[110px] w-[970px] px-[60px] flex flex-col gap-10 z-10">
                  {partidosAMostrar.map((p, index) => {
                    let catCorta = p.categoria;
                    if (catCorta.includes("Femenino")) catCorta = catCorta.replace("Femenino", "FEM");
                    if (catCorta.includes("Masculino")) catCorta = catCorta.replace("Masculino", "MASC");
                    const isLongCat = catCorta.length > 3;

                    return (
                      <div key={p.id || index} className="bg-white rounded-full shadow-md w-full h-[110px] flex items-center justify-between relative mt-4">
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white px-6 py-1 rounded-t-xl">
                          <span className="text-[#0E6CA8] font-black text-[28px] tracking-wide">{formatearHora(p.hora)}</span>
                        </div>

                        <div className="flex items-center gap-4 w-[40%] h-full">
                          <div className="w-[145px] h-[145px] -ml-[30px] shrink-0 bg-white rounded-full p-2 shadow-sm flex items-center justify-center">
                            {p.local?.logo_url ? (
                              <img 
                                src={`${p.local.logo_url}?t=${Date.now()}`} 
                                crossOrigin="anonymous" 
                                alt={p.local.nombre} 
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-black text-4xl">L</div>
                            )}
                          </div>
                          <span className="text-[#0E6CA8] font-black text-[26px] leading-tight uppercase line-clamp-2 pr-2">{p.local?.nombre || 'Local'}</span>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center shrink-0 w-[20%]">
                          <span className={`text-black font-black whitespace-nowrap ${isLongCat ? 'text-[36px] -mt-2' : 'text-[65px]'} leading-none tracking-wide`} style={{ fontFamily: '"Impact", sans-serif' }}>
                            <span className="text-[#E91B58]">{catCorta.charAt(0)}</span>{catCorta.slice(1)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-end gap-4 w-[40%] h-full text-right">
                          <span className="text-[#0E6CA8] font-black text-[26px] leading-tight uppercase line-clamp-2 pl-2">{p.visitante?.nombre || 'Visitante'}</span>
                          <div className="w-[145px] h-[145px] -mr-[30px] shrink-0 bg-white rounded-full p-2 shadow-sm flex items-center justify-center">
                            {p.visitante?.logo_url ? (
                              <img 
                                src={`${p.visitante.logo_url}?t=${Date.now()}`} 
                                crossOrigin="anonymous" 
                                alt={p.visitante.nombre} 
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-black text-4xl">V</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ==================================================== */
            /* LIENZO DE TABLA DE POSICIONES (EXPORTABLE)           */
            /* ==================================================== */
            <div 
              style={{ 
                transform: esStory ? 'scale(0.38)' : 'scale(0.48)', 
                transformOrigin: 'center center' 
              }} 
              className="flex justify-center items-center my-auto"
            >
              <div 
                ref={graficaPosicionesRef}
                className="relative overflow-hidden shadow-2xl shrink-0 flex flex-col justify-between"
                style={{ 
                  width: '1080px', 
                  height: esStory ? '1920px' : '1440px',
                  background: fondoPosiciones === 'dark_premium'
                    ? 'radial-gradient(circle at 50% 15%, #1e293b 0%, #0f172a 50%, #020617 100%)'
                    : `url(${fondoPosiciones}) center/cover no-repeat`
                }}
              >
                {/* Elementos visuales de fondo para Dark Mode */}
                {fondoPosiciones === 'dark_premium' && (
                  <>
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none"></div>
                  </>
                )}

                {/* 1. ENCABEZADO DE LA GRÁFICA */}
                <div className={`w-full px-16 ${esStory ? 'pt-20 pb-8' : 'pt-14 pb-6'} flex flex-col items-center relative z-10`}>
                  
                  {/* Barra superior con Logos oficiales */}
                  <div className="w-full flex justify-between items-center mb-6">
                    <div className="w-24 h-24 bg-white/95 rounded-2xl p-2 shadow-lg flex items-center justify-center border-2 border-white/40">
                      <img src="/logo-libalnna.png" alt="Libalnna" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-yellow-400 font-black text-[18px] tracking-[0.3em] uppercase drop-shadow-md">
                        {tituloFase}
                      </span>
                      <span className="text-white/60 font-bold text-[14px] uppercase tracking-widest mt-0.5">
                        LIGA DE BALONCESTO DE MENORES
                      </span>
                    </div>
                    <div className="w-24 h-24 bg-white/95 rounded-2xl p-2 shadow-lg flex items-center justify-center border-2 border-white/40">
                      <img src="/logo-29once.png" alt="29Once" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  {/* Título Principal */}
                  <h1 
                    className="text-white font-black uppercase tracking-tight text-center leading-none drop-shadow-xl"
                    style={{ 
                      fontSize: esStory ? '72px' : '62px',
                      fontFamily: '"Oswald", sans-serif'
                    }}
                  >
                    TABLA DE POSICIONES
                  </h1>

                  {/* Badge de Categoría */}
                  <div className="mt-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-black px-10 py-2.5 rounded-full shadow-xl border-2 border-white/30 flex items-center gap-3">
                    <span className="text-yellow-400 text-2xl">🏀</span>
                    <span 
                      className="text-[34px] tracking-widest uppercase"
                      style={{ fontFamily: '"Montserrat", sans-serif' }}
                    >
                      CATEGORÍA {categoriaPosiciones}
                    </span>
                  </div>

                </div>

                {/* 2. TABLA RESUMIDA (ÁREA CENTRAL) */}
                <div className={`w-full px-16 flex-1 flex flex-col justify-start relative z-10 ${esStory ? 'mt-2' : 'mt-0'}`}>
                  
                  {/* Encabezados de Columna */}
                  <div className="w-full flex items-center px-6 py-2.5 mb-3 text-white/80 font-black text-[22px] uppercase tracking-wider border-b-2 border-white/20">
                    <div className="w-[85px] text-center">POS</div>
                    <div className="flex-1 text-left pl-4">CLUB / EQUIPO</div>
                    <div className="w-[95px] text-center">PJ</div>
                    <div className="w-[95px] text-center text-emerald-400">PG</div>
                    <div className="w-[95px] text-center text-rose-400">PP</div>
                    <div className="w-[125px] text-center text-yellow-400">PTS</div>
                  </div>

                  {/* Filas de Equipos */}
                  {cargandoPosiciones ? (
                    <div className="py-20 text-center text-white/60 font-black text-3xl animate-pulse">
                      Calculando Posiciones...
                    </div>
                  ) : tablaPosiciones.length === 0 ? (
                    <div className="py-20 text-center text-white/50 font-bold text-2xl bg-white/5 rounded-3xl border border-white/10 p-8 my-auto">
                      No hay equipos o partidos registrados en esta categoría.
                    </div>
                  ) : (
                    <div className={`flex flex-col ${esStory ? 'gap-3.5' : 'gap-2.5'}`}>
                      {tablaPosiciones.slice(0, esStory ? 10 : 7).map((eq, index) => {
                        const pos = index + 1;
                        const esTopPlayoffs = limiteClasificados > 0 && pos <= limiteClasificados;

                        // Estilos de medalla / posición
                        let bgPos = 'bg-slate-900 text-white';
                        if (pos === 1) bgPos = 'bg-gradient-to-br from-yellow-400 to-amber-600 text-slate-950 font-black shadow-lg';
                        else if (pos === 2) bgPos = 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 font-black shadow-md';
                        else if (pos === 3) bgPos = 'bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black shadow-md';

                        return (
                          <div key={eq.id}>
                            <div 
                              className={`w-full rounded-2xl flex items-center px-5 shadow-lg border transition-all ${
                                esStory ? 'h-[96px]' : 'h-[86px]'
                              } ${
                                fondoPosiciones === 'dark_premium'
                                  ? 'bg-white/95 text-slate-900 border-white/30'
                                  : 'bg-white text-slate-900 border-gray-200'
                              }`}
                            >
                              {/* POSICIÓN */}
                              <div className="w-[85px] flex items-center justify-center shrink-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl ${bgPos}`}>
                                  {pos}
                                </div>
                              </div>

                              {/* EQUIPO (LOGO + NOMBRE) */}
                              <div className="flex-1 flex items-center gap-4 pl-3 overflow-hidden">
                                <div className="w-14 h-14 bg-white rounded-full p-1 border-2 border-gray-200 shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
                                  {eq.logo_url ? (
                                    <img 
                                      src={`${eq.logo_url}?t=${Date.now()}`}
                                      crossOrigin="anonymous"
                                      alt={eq.nombre}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-gray-400 font-black text-2xl">{eq.nombre?.charAt(0)}</span>
                                  )}
                                </div>
                                <span className="font-black text-slate-950 text-[26px] leading-tight uppercase truncate">
                                  {eq.nombre}
                                </span>
                              </div>

                              {/* PJ */}
                              <div className="w-[95px] text-center font-bold text-slate-600 text-[28px]">
                                {eq.pj}
                              </div>

                              {/* PG */}
                              <div className="w-[95px] text-center font-black text-emerald-600 text-[30px]">
                                {eq.jg}
                              </div>

                              {/* PP */}
                              <div className="w-[95px] text-center font-bold text-rose-500 text-[28px]">
                                {eq.jp}
                              </div>

                              {/* PTS (DESTACADO) */}
                              <div className="w-[125px] flex items-center justify-center shrink-0">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-[30px] px-5 py-1 rounded-xl shadow-md min-w-[70px] text-center border border-blue-400">
                                  {eq.pts}
                                </div>
                              </div>
                            </div>

                            {/* LÍNEA DE PLAYOFFS */}
                            {limiteClasificados > 0 && pos === limiteClasificados && pos < tablaPosiciones.length && (
                              <div className="flex items-center gap-3 my-2 px-2">
                                <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
                                <span className="text-yellow-400 text-[13px] font-black uppercase tracking-widest bg-yellow-400/10 px-3 py-0.5 rounded-full border border-yellow-400/30">
                                  ⭐ ZONA DE CLASIFICACIÓN A PLAYOFFS ⭐
                                </span>
                                <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* 3. PIE DE PÁGINA (BRANDING) */}
                <div className={`w-full px-16 ${esStory ? 'pb-16 pt-6' : 'pb-10 pt-4'} flex justify-between items-center relative z-10 border-t border-white/10 text-white/70`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[16px] uppercase tracking-wider">
                      Oficial • Libalnna 2026
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[16px] text-yellow-400 uppercase tracking-widest block">
                      @somos29oncemedios
                    </span>
                    <span className="text-[12px] text-white/50 font-medium">
                      www.libalnna.com
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

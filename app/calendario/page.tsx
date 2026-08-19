'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import html2canvas from 'html2canvas';

export default function Calendario() {
  const categorias = ["Todas", "U8", "U10", "U12", "U14", "U16 Femenino", "U16 Masculino", "U18", "U20"];
  
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);
  const [seccionActiva, setSeccionActiva] = useState<"proximos" | "resultados">("proximos");
  
  const [partidos, setPartidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // 🏀 ESTADOS PARA COMPARTIR EN REDES
  const [modalCompartir, setModalCompartir] = useState(false);
  const [formatoRedes, setFormatoRedes] = useState<'9:16' | '1:1' | '4:3'>('9:16');
  const [generandoImagen, setGenerandoImagen] = useState(false);
  const [bloqueACompartir, setBloqueACompartir] = useState<any>(null);
  const tarjetaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPartidos = async () => {
      const { data, error } = await supabase
        .from('partidos')
        .select(`
          id, fecha, hora, estado, fase_torneo, lugar, categoria, puntos_local, puntos_visitante,
          local:equipos!equipo_local_id(nombre, logo_url),
          visitante:equipos!equipo_visitante_id(nombre, logo_url)
        `)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (data) {
        setPartidos(data);
      }
      setCargando(false);
    };

    fetchPartidos();
  }, []);

  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return "Fecha por definir";
    const [year, month, day] = fechaStr.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const nombreDia = diasSemana[dateObj.getDay()];
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const nombreMes = meses[parseInt(month, 10) - 1];
    
    return `${nombreDia}, ${day} de ${nombreMes} de ${year}`;
  };

  const formatearHora = (horaStr: string) => {
    if (!horaStr) return "Hora por definir";
    let [h, m] = horaStr.split(':');
    let horaNum = parseInt(h, 10);
    const ampm = horaNum >= 12 ? 'PM' : 'AM';
    horaNum = horaNum % 12 || 12;
    return `${horaNum}:${m} ${ampm}`;
  };

  // Filtrados
  const partidosPorCategoria = categoriaActiva === "Todas"
    ? partidos
    : partidos.filter(partido => partido.categoria === categoriaActiva);

  let partidosAMostrar = partidosPorCategoria.filter(partido => {
    if (seccionActiva === "resultados") return partido.estado === "finalizado";
    return partido.estado !== "finalizado";
  });

  if (seccionActiva === "resultados") partidosAMostrar = partidosAMostrar.reverse();

  // Agrupación Plana (Fecha + Sede)
  const gruposPartidos = partidosAMostrar.reduce((acc: any, partido) => {
    const fecha = partido.fecha || "Fecha por definir";
    const sede = partido.lugar || "Sede por definir";
    const clave = `${fecha}|${sede}`;
    
    if (!acc[clave]) {
      acc[clave] = { fecha, sede, partidos: [] };
    }
    acc[clave].partidos.push(partido);
    return acc;
  }, {});

  const bloquesDePartidos = Object.values(gruposPartidos);

  // 🏀 LÓGICA DE CAPTURA DE IMAGEN Y WEB SHARE API
  const abrirModalCompartir = (bloque: any) => {
    setBloqueACompartir(bloque);
    setModalCompartir(true);
  };

  const compartirOdescargarImagen = async () => {
    if (!tarjetaRef.current || !bloqueACompartir) return;
    setGenerandoImagen(true);
    
    try {
      const canvas = await html2canvas(tarjetaRef.current, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#111827' // Fondo oscuro de la tarjeta
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setGenerandoImagen(false);
          return;
        }

        const fileName = `Jornada-${bloqueACompartir.sede.replace(/\s+/g, '-')}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        // Verificamos si el dispositivo soporta compartir archivos nativamente
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Cartelera Libalnna',
              text: `¡Cartelera Oficial para ${bloqueACompartir.sede}! 🏀🔥`,
            });
          } catch (error) {
            console.log("El usuario canceló o falló al compartir", error);
          }
        } else {
          // Fallback: Descarga normal en PC
          const dataUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = file.name;
          link.href = dataUrl;
          link.click();
          alert("Tu dispositivo no soporta compartir directamente a una App. La imagen se ha descargado a tu galería.");
        }
        
        setGenerandoImagen(false);
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      alert("❌ Hubo un error al generar la imagen. Intenta de nuevo.");
      console.error(error);
      setGenerandoImagen(false);
    }
  };

  return (
    <main className="container mx-auto py-6 md:py-12 px-3 md:px-4 max-w-5xl">
      <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4 text-center md:text-left">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">Calendario de Juegos</h1>
          <p className="text-xs md:text-base text-gray-500 mt-1 font-medium">Temporada Regular - Torneo Formativo</p>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-hide">
        {categorias.map((cat) => (
          <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold text-xs md:text-sm transition-all whitespace-nowrap ${categoriaActiva === cat ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"}`}>
            {cat === "Todas" ? "Todas las Categorías" : `Categoría ${cat}`}
          </button>
        ))}
      </div>

      <div className="flex justify-center md:justify-start gap-2 md:gap-4 mb-6 md:mb-8 border-b border-gray-200 pb-4">
        <button onClick={() => setSeccionActiva("proximos")} className={`px-4 py-2 md:px-6 rounded-lg font-black text-xs md:text-sm uppercase tracking-wide transition-all ${seccionActiva === "proximos" ? "bg-gray-900 text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Próximos Partidos</button>
        <button onClick={() => setSeccionActiva("resultados")} className={`px-4 py-2 md:px-6 rounded-lg font-black text-xs md:text-sm uppercase tracking-wide transition-all ${seccionActiva === "resultados" ? "bg-green-600 text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Resultados</button>
      </div>

      {cargando ? (
        <div className="text-center py-10 md:py-20 text-base md:text-xl font-bold text-gray-500">Cargando la cartelera oficial...</div>
      ) : bloquesDePartidos.length === 0 ? (
        <div className="text-center py-10 md:py-20 text-base md:text-xl font-bold text-gray-500 px-4">No hay partidos en esta categoría.</div>
      ) : (
        <div className="flex flex-col gap-8 md:gap-12">
          {bloquesDePartidos.map((bloque: any, index: number) => (
            <div key={index} className="flex flex-col gap-3 md:gap-4">
              
              {/* Cabecera del Bloque: SEDE, FECHA Y BOTÓN COMPARTIR */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-3 border-b-2 border-gray-900 pb-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-xl md:text-2xl">📍</span>
                    <h2 className="text-lg md:text-2xl font-black text-gray-900 uppercase tracking-wide">
                      Sede: <span className="text-blue-600">{bloque.sede}</span>
                    </h2>
                  </div>
                  <span className="text-[10px] md:text-sm font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg tracking-wide uppercase shadow-sm inline-block self-start">
                    📅 {formatearFecha(bloque.fecha)}
                  </span>
                </div>
                
                {/* 🏀 BOTÓN DE COMPARTIR JORNADA */}
                <button 
                  onClick={() => abrirModalCompartir(bloque)}
                  className="mt-2 md:mt-0 bg-gray-900 hover:bg-black text-white text-[10px] md:text-xs font-black px-4 py-2 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  📲 Compartir Jornada
                </button>
              </div>

              {/* Partidos de ese Bloque */}
              <div className="flex flex-col gap-3 md:gap-6 mt-1">
                {bloque.partidos.map((partido: any) => (
                  <div key={partido.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    
                    <div className="bg-gray-50 px-3 py-2 md:px-6 md:py-3 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-1 text-center sm:text-left">
                      <span className="font-black text-blue-600 text-[11px] md:text-sm tracking-wide">⏱️ {formatearHora(partido.hora)}</span>
                      <span className="text-[9px] md:text-xs font-semibold text-gray-500 flex flex-wrap justify-center sm:justify-end items-center gap-1 uppercase tracking-wider">
                        <span className="text-blue-600 font-bold">{partido.categoria}</span> 
                        <span className="hidden sm:inline">•</span> 
                        <span>{partido.fase_torneo}</span>
                      </span>
                    </div>

                    <div className="px-2 py-3 md:px-6 md:py-8 grid grid-cols-3 items-start w-full gap-1 md:gap-2">
                      <div className="flex flex-col items-center gap-1 md:gap-3">
                        <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0 overflow-hidden shadow-sm">
                          {partido.local?.logo_url ? <img src={partido.local.logo_url} alt="Local" crossOrigin="anonymous" className="w-full h-full object-contain p-1" /> : <span className="text-gray-300 font-black text-lg md:text-2xl">{partido.local?.nombre?.charAt(0) || 'L'}</span>}
                        </div>
                        <span className="font-bold text-gray-900 text-[9px] sm:text-sm md:text-base text-center uppercase leading-tight px-0.5">{partido.local?.nombre || 'Local'}</span>
                      </div>

                      <div className="flex flex-col items-center justify-start pt-1 md:pt-4">
                        {partido.estado === "finalizado" ? (
                          <>
                            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
                              <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{partido.puntos_local ?? 0}</span>
                              <span className="text-gray-300 font-black text-sm md:text-2xl">-</span>
                              <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{partido.puntos_visitante ?? 0}</span>
                            </div>
                            <span className="mt-1 md:mt-2 text-[7px] md:text-xs font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 md:px-3 md:py-1 rounded-full border border-gray-100 text-center leading-none">FINALIZADO</span>
                          </>
                        ) : partido.estado === "en curso" ? (
                          <>
                            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
                              <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{partido.puntos_local ?? 0}</span>
                              <span className="text-gray-300 font-black text-sm md:text-2xl">-</span>
                              <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{partido.puntos_visitante ?? 0}</span>
                            </div>
                            <div className="mt-1 md:mt-2 flex flex-col items-center gap-0.5 md:gap-1">
                              <span className="text-[8px] md:text-xs font-black text-red-500 animate-pulse flex items-center gap-1"><span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full"></span> EN VIVO</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-xl sm:text-3xl md:text-5xl font-black text-gray-200">VS</span>
                            <span className="mt-1 md:mt-2 text-[7px] md:text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 md:px-3 md:py-1 rounded-full border border-blue-200 text-center leading-none">POR JUGAR</span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-1 md:gap-3">
                        <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100 shrink-0 overflow-hidden shadow-sm">
                          {partido.visitante?.logo_url ? <img src={partido.visitante.logo_url} alt="Visita" crossOrigin="anonymous" className="w-full h-full object-contain p-1" /> : <span className="text-gray-300 font-black text-lg md:text-2xl">{partido.visitante?.nombre?.charAt(0) || 'V'}</span>}
                        </div>
                        <span className="font-bold text-gray-900 text-[9px] sm:text-sm md:text-base text-center uppercase leading-tight px-0.5">{partido.visitante?.nombre || 'Visitante'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🏀 MODAL PARA GENERAR CARTELERA DE REDES SOCIALES */}
      {modalCompartir && bloqueACompartir && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 md:p-8 max-w-4xl w-full shadow-2xl flex flex-col items-center relative my-8">
            <button onClick={() => setModalCompartir(false)} className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-black text-gray-700 transition-colors">✕</button>
            
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2 text-center mt-4">Compartir en Redes</h2>
            <p className="text-gray-500 font-bold text-sm mb-6 text-center">Selecciona el formato y envíalo directamente a tu App favorita.</p>

            {/* Formatos */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <button onClick={() => setFormatoRedes('9:16')} className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm uppercase tracking-wide transition-all ${formatoRedes === '9:16' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>📱 Historia (9:16)</button>
              <button onClick={() => setFormatoRedes('1:1')} className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm uppercase tracking-wide transition-all ${formatoRedes === '1:1' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🖼️ Cuadrado (1:1)</button>
              <button onClick={() => setFormatoRedes('4:3')} className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm uppercase tracking-wide transition-all ${formatoRedes === '4:3' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>💻 Horizontal (4:3)</button>
            </div>

            {/* Contenedor del Lienzo */}
            <div className="w-full overflow-y-auto bg-gray-100 rounded-2xl p-4 md:p-8 flex justify-center items-start border-2 border-dashed border-gray-300 max-h-[60vh]">
              
              {/* 🎨 EL LIENZO A EXPORTAR (AHORA CON LOGOS INTEGRADOS) */}
              <div 
                ref={tarjetaRef} 
                className={`relative flex flex-col bg-gray-900 shadow-2xl p-6 ${
                  formatoRedes === '9:16' ? 'w-[360px] min-h-[640px]' :
                  formatoRedes === '1:1' ? 'w-[500px] min-h-[500px]' :
                  'w-[600px] min-h-[450px]'
                }`}
              >
                {/* Fondo sutil */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

                {/* Cabecera Gráfico */}
                <div className="relative z-10 text-center border-b border-gray-700 pb-4 mb-4">
                  <h1 className="text-white font-black text-2xl tracking-[0.2em] uppercase">LIBALNNA</h1>
                  <h2 className="text-blue-400 font-bold text-[10px] uppercase tracking-widest mt-1">CARTELERA OFICIAL</h2>
                  <div className="mt-3 bg-gray-800 rounded-lg py-2">
                    <p className="text-white font-black text-xs uppercase">{bloqueACompartir.sede}</p>
                    <p className="text-gray-400 font-bold text-[10px] uppercase mt-0.5">{formatearFecha(bloqueACompartir.fecha)}</p>
                  </div>
                </div>

                {/* Lista de Partidos Minimalista */}
                <div className="relative z-10 flex flex-col gap-3 w-full">
                  {bloqueACompartir.partidos.map((p: any, i: number) => (
                    <div key={i} className="bg-gray-800/80 rounded-xl p-3 flex flex-col gap-2 border border-gray-700">
                      
                      <div className="flex justify-between items-center border-b border-gray-700/50 pb-1.5">
                        <span className="text-yellow-400 font-black text-[9px] uppercase">⏱️ {formatearHora(p.hora)}</span>
                        <span className="bg-gray-700 text-gray-300 text-[8px] font-bold px-2 py-0.5 rounded uppercase">{p.categoria}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        
                        {/* LOCAL (Ahora con escudo) */}
                        <div className="flex flex-col items-center gap-1.5 w-[40%]">
                           <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center p-0.5 overflow-hidden shadow-sm">
                              {p.local?.logo_url ? <img src={p.local.logo_url} alt="Local" crossOrigin="anonymous" className="w-full h-full object-contain" /> : <span className="text-gray-900 font-black text-[10px] md:text-xs">{p.local?.nombre?.charAt(0) || 'L'}</span>}
                           </div>
                           <span className="text-white font-black text-[9px] md:text-[10px] text-center uppercase leading-tight line-clamp-2">{p.local?.nombre}</span>
                           {p.estado === 'finalizado' && <span className="text-white font-black text-lg md:text-xl">{p.puntos_local}</span>}
                        </div>
                        
                        {/* MARCADOR/STATUS */}
                        <div className="flex flex-col items-center w-[20%]">
                          {p.estado === 'finalizado' ? <span className="text-[8px] bg-white text-gray-900 px-1.5 py-0.5 rounded font-black">FINAL</span> : <span className="text-gray-500 font-black text-[10px]">VS</span>}
                        </div>

                        {/* VISITANTE (Ahora con escudo) */}
                        <div className="flex flex-col items-center gap-1.5 w-[40%]">
                           <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center p-0.5 overflow-hidden shadow-sm">
                              {p.visitante?.logo_url ? <img src={p.visitante.logo_url} alt="Visita" crossOrigin="anonymous" className="w-full h-full object-contain" /> : <span className="text-gray-900 font-black text-[10px] md:text-xs">{p.visitante?.nombre?.charAt(0) || 'V'}</span>}
                           </div>
                           <span className="text-white font-black text-[9px] md:text-[10px] text-center uppercase leading-tight line-clamp-2">{p.visitante?.nombre}</span>
                           {p.estado === 'finalizado' && <span className="text-white font-black text-lg md:text-xl">{p.puntos_visitante}</span>}
                        </div>
                        
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={compartirOdescargarImagen}
              disabled={generandoImagen}
              className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white w-full md:w-auto md:px-12 py-4 rounded-xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {generandoImagen ? 'Preparando archivo...' : '📲 Compartir a Redes'}
            </button>
            <p className="text-center text-[10px] text-gray-500 font-semibold mt-2">
              (En PC descargará la imagen, en celular abrirá tus Apps de redes)
            </p>
          </div>
        </div>
      )}

    </main>
  );
}
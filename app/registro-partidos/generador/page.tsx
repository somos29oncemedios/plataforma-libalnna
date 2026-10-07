'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/supabase';
import { toPng } from 'html-to-image';

export default function GeneradorGraficas() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [fechas, setFechas] = useState<string[]>([]);
  
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [fondoUrl, setFondoUrl] = useState('/fondo-amarillo.png');

  const graficaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarPartidos();
  }, []);

  const cargarPartidos = async () => {
    setCargando(true);
    const { data, error } = await supabase
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
      // Ordenar cronológicamente (YYYY-MM-DD permite ordenamiento alfabético)
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

  const manejarCambioFecha = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaFecha = e.target.value;
    setFechaSeleccionada(nuevaFecha);
    
    // Al cambiar la fecha, seleccionar automáticamente la primera sede disponible de ese día
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

  const descargarImagen = async () => {
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

  const sedesDisponibles = Array.from(new Set(partidos.filter(p => p.fecha === fechaSeleccionada).map(p => p.lugar).filter(Boolean))) as string[];
  const partidosAMostrar = partidos.filter(p => p.fecha === fechaSeleccionada && p.lugar === sedeSeleccionada);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* PANEL DE CONTROLES */}
        <div className="w-full md:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-fit">
          <h1 className="text-2xl font-black text-gray-900 mb-6 uppercase">Creador de Gráficas</h1>
          
          {cargando ? (
            <p className="text-gray-500">Cargando datos...</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 font-medium"
                  value={fechaSeleccionada}
                  onChange={manejarCambioFecha}
                >
                  {fechas.map(f => <option key={f} value={f}>{formatearFechaParaSelect(f)}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Sede (Cancha)</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 font-medium"
                  value={sedeSeleccionada}
                  onChange={(e) => setSedeSeleccionada(e.target.value)}
                >
                  {sedesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Color del Fondo</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 font-medium"
                  value={fondoUrl}
                  onChange={(e) => setFondoUrl(e.target.value)}
                >
                  <option value="/fondo-amarillo.png">🟡 Fondo Amarillo</option>
                  <option value="/fondo-azul.png">🔵 Fondo Azul</option>
                  <option value="/fondo-verde.png">🟢 Fondo Verde</option>
                </select>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  Hay <strong>{partidosAMostrar.length}</strong> partidos programados para esta fecha y sede.
                </p>
                {partidosAMostrar.length > 5 && (
                  <p className="text-xs text-red-600 font-bold mt-2">
                    ⚠️ Tienes más de 5 partidos. Podrían verse muy amontonados en la imagen final.
                  </p>
                )}
              </div>

              <button 
                onClick={descargarImagen}
                disabled={generando || partidosAMostrar.length === 0}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black py-4 rounded-xl shadow-md uppercase transition-all flex justify-center items-center gap-2"
              >
                {generando ? 'Generando...' : '📥 Descargar Gráfica (PNG)'}
              </button>
              
              <a href="/registro-partidos" className="text-center text-sm text-gray-500 font-bold hover:text-gray-800 mt-2">
                Volver al panel
              </a>
            </div>
          )}
        </div>

        {/* PREVIEW DEL LIENZO */}
        <div className="w-full md:w-2/3 bg-gray-200 rounded-xl overflow-hidden flex justify-center items-center relative border-4 border-dashed border-gray-300 min-h-[800px]">
          
          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
            Vista Previa (1080 x 1440 px)
          </div>

          {/* CONTENEDOR ESCALADO PARA VERLO EN PANTALLA */}
          <div style={{ transform: 'scale(0.5)', transformOrigin: 'center center' }} className="flex justify-center items-center">
            
            {/* EL LIENZO REAL - ESTE ES EL QUE SE EXPORTA */}
            <div 
              ref={graficaRef}
              className="relative overflow-hidden shadow-2xl bg-gray-900"
              style={{ width: '1080px', height: '1440px', backgroundImage: `url(${fondoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <link href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@700&display=swap" rel="stylesheet" />
              
              {/* ÁREA ÚTIL (Ignorando la barra de 110px de la izquierda) */}
              
              {/* Cinta rosa de fecha (Alineación absoluta exacta) */}
              <div className="absolute top-[295px] left-[545px] -translate-x-1/2 z-20 w-full text-center">
                <h2 className="text-[37px] text-white font-black uppercase tracking-widest leading-none" style={{ fontFamily: '"Oswald", sans-serif' }}>
                  {formatearFechaCabecera(fechaSeleccionada)}
                </h2>
              </div>
              
              {/* Cancha (Alineación absoluta exacta para evitar choques) */}
              <div className="absolute top-[357px] left-[480px] z-20">
                <span className="font-bold text-black text-[46px] tracking-tight">{sedeSeleccionada}</span>
              </div>

              {/* LISTA DE PARTIDOS */}
              <div className="absolute top-[460px] left-[110px] w-[970px] px-[60px] flex flex-col gap-10 z-10">
                
                {partidosAMostrar.map((p, index) => {
                  // Abreviar categorías largas (ej: U16 Femenino -> U16 FEM)
                  let catCorta = p.categoria;
                  if (catCorta.includes("Femenino")) catCorta = catCorta.replace("Femenino", "FEM");
                  if (catCorta.includes("Masculino")) catCorta = catCorta.replace("Masculino", "MASC");
                  
                  const isLongCat = catCorta.length > 3;

                  return (
                    <div key={p.id || index} className="bg-white rounded-full shadow-md w-full h-[110px] flex items-center justify-between relative mt-4">
                      
                      {/* HORA (Flotando arriba al centro) */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white px-6 py-1 rounded-t-xl">
                        <span className="text-[#0E6CA8] font-black text-[28px] tracking-wide">{formatearHora(p.hora)}</span>
                      </div>

                      {/* EQUIPO LOCAL (Logo desbordando a la izquierda) */}
                      <div className="flex items-center gap-4 w-[40%] h-full">
                        <div className="w-[145px] h-[145px] -ml-[30px] shrink-0 bg-white rounded-full p-2 shadow-sm flex items-center justify-center">
                          {p.local?.logo_url ? (
                            <img src={`${p.local.logo_url}?t=${Date.now()}`} crossOrigin="anonymous" alt={p.local.nombre} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-black text-4xl">L</div>
                          )}
                        </div>
                        <span className="text-[#0E6CA8] font-black text-[26px] leading-tight uppercase line-clamp-2 pr-2">{p.local?.nombre || 'Local'}</span>
                      </div>
                      
                      {/* CATEGORÍA EN EL CENTRO */}
                      <div className="flex flex-col items-center justify-center shrink-0 w-[20%]">
                        <span className={`text-black font-black ${isLongCat ? 'text-[45px] -mt-2' : 'text-[65px]'} leading-none tracking-wide`} style={{ fontFamily: '"Impact", sans-serif' }}>
                          <span className="text-[#E91B58]">{catCorta.charAt(0)}</span>{catCorta.slice(1)}
                        </span>
                      </div>
                      
                      {/* EQUIPO VISITANTE (Logo desbordando a la derecha) */}
                      <div className="flex items-center justify-end gap-4 w-[40%] h-full text-right">
                        <span className="text-[#0E6CA8] font-black text-[26px] leading-tight uppercase line-clamp-2 pl-2">{p.visitante?.nombre || 'Visitante'}</span>
                        <div className="w-[145px] h-[145px] -mr-[30px] shrink-0 bg-white rounded-full p-2 shadow-sm flex items-center justify-center">
                          {p.visitante?.logo_url ? (
                            <img src={`${p.visitante.logo_url}?t=${Date.now()}`} crossOrigin="anonymous" alt={p.visitante.nombre} className="w-full h-full object-contain" />
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
        </div>
      </div>
    </div>
  );
}

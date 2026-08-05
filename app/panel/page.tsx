'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';

export default function PanelDeControl() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<string | null>('Cargando...');

  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Mantenemos la corrección de TypeScript para el usuario
        setUsuario(user.email || 'Administrador');
      } else {
        router.push('/login');
      }
    };
    obtenerUsuario();
  }, [router]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    document.cookie = "libalnna_admin=; path=/; max-age=0"; // Borrar credencial
    router.push('/');
  };

  return (
    <main className="container mx-auto py-12 px-4 max-w-5xl">
      {/* Cabecera del Panel */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 rounded-2xl p-8 mb-10 shadow-lg">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Panel de Control</h1>
          <p className="text-blue-400 font-medium mt-1">Usuario activo: {usuario}</p>
        </div>
        <button onClick={cerrarSesion} className="mt-4 md:mt-0 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          Cerrar Sesión
        </button>
      </div>

      {/* Botones de las funciones en una cuadrícula perfecta de 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Gestión de Equipos */}
        <Link href="/registro-equipos" className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-500 hover:shadow-xl transition-all group flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl group-hover:bg-blue-600 group-hover:text-white transition-colors">🛡️</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">Clubes</h2>
            <p className="text-gray-500 font-medium">Crear, editar o eliminar equipos.</p>
          </div>
        </Link>

        {/* Gestión de Jugadores */}
        <Link href="/registro-jugadores" className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-500 hover:shadow-xl transition-all group flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl group-hover:bg-blue-600 group-hover:text-white transition-colors">⛹️‍♂️</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">Atletas</h2>
            <p className="text-gray-500 font-medium">Fichajes y gestión de plantillas.</p>
          </div>
        </Link>

        {/* NUEVO: Programación de Partidos */}
        <Link href="/registro-partidos" className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-green-500 hover:shadow-xl transition-all group flex items-center gap-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl group-hover:bg-green-600 group-hover:text-white transition-colors">📅</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">Calendario</h2>
            <p className="text-gray-500 font-medium">Programar, editar o eliminar partidos.</p>
          </div>
        </Link>

        {/* Mesa Técnica */}
        <Link href="/mesa-tecnica" className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-yellow-500 hover:shadow-xl transition-all group flex items-center gap-6 bg-gradient-to-r hover:from-white hover:to-yellow-50">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-3xl group-hover:bg-yellow-500 group-hover:text-white transition-colors">⏱️</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">Mesa Técnica (Live)</h2>
            <p className="text-gray-500 font-medium">Llevar puntos, faltas y tiempos en vivo.</p>
          </div>
        </Link>

      </div>
    </main>
  );
}
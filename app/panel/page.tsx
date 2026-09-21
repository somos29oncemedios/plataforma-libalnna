'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';

export default function PanelDeControl() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<string | null>('Cargando...');
  const [rol, setRol] = useState<string | null>(null);
  const [cargandoRol, setCargandoRol] = useState(true);

  useEffect(() => {
    const obtenerUsuarioYRol = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUsuario(user.email || 'Usuario');

      // Consultamos el rol en la tabla perfiles
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (perfil) {
        setRol(perfil.rol);

        // Si es programador y está intentando ver el panel principal, 
        // lo mandamos directamente a su única sección permitida.
        if (perfil.rol === 'programador') {
          router.replace('/registro-partidos');
          return;
        }
      }

      setCargandoRol(false);
    };

    obtenerUsuarioYRol();
  }, [router]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    document.cookie = "libalnna_admin=; path=/; max-age=0";
    document.cookie = "sb-access-token=; path=/; max-age=0";
    window.location.href = '/login';
  };

  // Mientras valida el rol, mostramos pantalla limpia sin mostrar botones prohibidos
  if (cargandoRol) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <p className="text-xl font-bold text-gray-600 animate-pulse">Cargando panel seguro...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto py-12 px-4 max-w-5xl">
      {/* Cabecera del Panel */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 rounded-2xl p-8 mb-10 shadow-lg">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Panel de Control</h1>
          <p className="text-blue-400 font-medium mt-1">Usuario: {usuario} ({rol === 'admin' ? 'Administrador' : 'Programador'})</p>
        </div>
        <button onClick={cerrarSesion} className="mt-4 md:mt-0 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          Cerrar Sesión
        </button>
      </div>

      {/* Cuadrícula de herramientas (Solo para administradores generales) */}
      {rol === 'admin' ? (
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

          {/* Programación de Partidos */}
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
      ) : (
        /* Vista exclusiva para el programador si por alguna razón no alcanzó a redirigir */
        <div className="bg-white border-2 border-green-200 rounded-2xl p-10 text-center shadow-lg">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">📅</div>
          <h2 className="text-2xl font-black text-gray-900 uppercase mb-2">Panel de Programación</h2>
          <p className="text-gray-600 mb-6">Tienes acceso exclusivo para gestionar el calendario y los emparejamientos de la liga.</p>
          <Link href="/registro-partidos" className="inline-block bg-green-600 hover:bg-green-700 text-white font-black py-3 px-8 rounded-xl transition-colors uppercase tracking-wide">
            Ir a Crear Calendario ➔
          </Link>
        </div>
      )}
    </main>
  );
}
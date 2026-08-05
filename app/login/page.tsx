'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';

export default function LoginAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    
    // Autenticación real con Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('❌ Correo o contraseña incorrectos.');
      setCargando(false);
    } else if (data.session) {
      // Creamos la credencial manual para el middleware
      document.cookie = "libalnna_admin=true; path=/; max-age=86400";
      router.push('/panel');
    }
  };

  return (
    <main className="container mx-auto py-20 px-4 flex justify-center items-center min-h-[75vh]">
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-10 w-full max-w-md shadow-xl text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">Acceso Oficial</h1>
        <p className="text-gray-500 font-medium mb-8">Inicia sesión para administrar Libalnna.</p>

        <form onSubmit={iniciarSesion} className="flex flex-col gap-4 text-left">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-300 p-3 rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-300 p-3 rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors" 
              required
            />
          </div>
          {error && (
            <p className="text-red-600 font-bold text-sm bg-red-100 p-3 rounded-lg text-center mt-2">{error}</p>
          )}
          <button type="submit" disabled={cargando} className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-xl transition-colors shadow-md mt-4 uppercase tracking-wide disabled:opacity-50">
            {cargando ? 'Verificando...' : 'Entrar al Sistema'}
          </button>
        </form>
      </div>
    </main>
  );
}
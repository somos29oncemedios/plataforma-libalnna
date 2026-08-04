'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginAdmin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const iniciarSesion = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔐 CONTRASEÑA MAESTRA DE LA LIGA (Cámbiala si lo deseas)
    if (password === 'MesaTecnica2026') {
      
      // Entregamos la "Credencial" (Cookie válida por 1 día)
      document.cookie = "libalnna_admin=acceso_concedido; path=/; max-age=86400";
      
      // Damos el pase directo a la mesa técnica
      router.push('/mesa-tecnica');
      
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <main className="container mx-auto py-20 px-4 flex justify-center items-center min-h-[70vh]">
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-10 w-full max-w-md shadow-xl text-center">
        
        <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">Zona Restringida</h1>
        <p className="text-gray-500 font-medium mb-8">Acceso exclusivo para la Mesa Técnica y Directiva de Libalnna.</p>

        <form onSubmit={iniciarSesion} className="flex flex-col gap-4">
          <div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Ingresa la Contraseña Maestra" 
              className={`w-full border-2 p-4 rounded-xl font-bold text-center focus:outline-none transition-colors ${
                error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 bg-gray-50 focus:bg-white'
              }`} 
              required
            />
          </div>

          {error && (
            <p className="text-red-600 font-bold text-sm bg-red-100 p-2 rounded-lg">
              ❌ Contraseña incorrecta. Intenta de nuevo.
            </p>
          )}

          <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-xl transition-colors shadow-md mt-2 uppercase tracking-wide">
            Desbloquear Paneles
          </button>
        </form>
      </div>
    </main>
  );
}
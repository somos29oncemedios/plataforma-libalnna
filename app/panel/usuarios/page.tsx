'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';

export default function GestionUsuarios() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Formulario nuevo usuario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('programador');

  useEffect(() => {
    validarAdminYListar();
  }, []);

  const validarAdminYListar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const esAdminSuper = user.email === 'somos29once@gmail.com';
    const esAdminNormal = perfil?.rol?.toLowerCase().trim() === 'admin';

    if (!esAdminSuper && !esAdminNormal) {
      router.push('/panel');
      return;
    }

    obtenerUsuarios();
  };

  const obtenerUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsuarios(data.usuarios || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener usuarios');
    } finally {
      setCargando(false);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rol }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setExito('Usuario creado correctamente');
      setEmail('');
      setPassword('');
      setRol('programador');
      obtenerUsuarios();
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario');
    }
  };

  if (cargando) {
    return <div className="min-h-[50vh] flex justify-center items-center font-bold animate-pulse text-gray-500">Cargando gestión de usuarios...</div>;
  }

  return (
    <main className="container mx-auto py-12 px-4 max-w-6xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/panel" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold">
          ← Volver al Panel
        </Link>
        <h1 className="text-3xl font-black text-gray-900 uppercase">Gestión de Usuarios y Accesos</h1>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 font-bold">{error}</div>}
      {exito && <div className="bg-green-100 text-green-700 p-4 rounded-xl mb-6 font-bold">{exito}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario de creación */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 h-fit">
          <h2 className="text-xl font-bold mb-4 uppercase text-gray-800">Nuevo Usuario</h2>
          <form onSubmit={handleCrearUsuario} className="flex flex-col gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Email</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 outline-none"
                placeholder="ejemplo@libalnna.com"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">Contraseña</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">Rol / Acceso</label>
              <select 
                value={rol} 
                onChange={e => setRol(e.target.value)} 
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 outline-none font-medium"
              >
                <option value="admin">Admin (Acceso Total)</option>
                <option value="programador">Programador (Calendario)</option>
                <option value="mesa_tecnica">Mesa Técnica (Marcador Live)</option>
                <option value="gestor_equipos">Gestor (Equipos y Jugadores)</option>
              </select>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-lg mt-2 transition-colors">
              Crear Usuario
            </button>
          </form>
          <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <strong>Nota:</strong> Para que esta función trabaje, el entorno debe tener la variable <code>SUPABASE_SERVICE_ROLE_KEY</code> configurada.
          </div>
        </div>

        {/* Lista de usuarios */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4 uppercase text-gray-800">Usuarios Registrados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-4 font-bold border-b-2">Email</th>
                  <th className="p-4 font-bold border-b-2">Rol Actual</th>
                  <th className="p-4 font-bold border-b-2">Fecha Creación</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-500">No hay usuarios o falta la configuración.</td>
                  </tr>
                ) : (
                  usuarios.map(u => (
                    <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium">{u.email}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          u.rol === 'admin' ? 'bg-red-100 text-red-700' :
                          u.rol === 'programador' ? 'bg-green-100 text-green-700' :
                          u.rol === 'mesa_tecnica' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {u.rol.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 text-sm">
                        {new Date(u.creado).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}

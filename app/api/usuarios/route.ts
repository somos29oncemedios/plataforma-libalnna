import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Es importante usar la Service Role Key para poder crear usuarios sin estar autenticados como ellos
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: Request) {
  try {
    const { email, password, rol, nombre } = await request.json();

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    // 1. Crear el usuario en auth.users
    const { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar automáticamente
    });

    if (authError) throw authError;

    // 2. Insertar/Actualizar el perfil con el rol asignado
    if (userAuth.user) {
      const { error: profileError } = await supabaseAdmin
        .from('perfiles')
        .upsert({
          id: userAuth.user.id,
          email: email,
          rol: rol.toLowerCase(),
        });

      if (profileError) throw profileError;
    }

    return NextResponse.json({ success: true, user: userAuth.user });
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET() {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    // Obtener usuarios desde perfiles
    const { data: perfiles, error } = await supabaseAdmin
      .from('perfiles')
      .select('id, rol');

    if (error) throw error;
    
    // Opcional: Para obtener el email de los usuarios habría que consultar auth.admin.listUsers()
    // Ya que 'perfiles' por lo general no guarda el email.
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) throw usersError;

    const usuariosCompletos = users.map(u => {
      const perfil = perfiles.find(p => p.id === u.id);
      return {
        id: u.id,
        email: u.email,
        rol: perfil ? perfil.rol : 'sin rol',
        creado: u.created_at
      };
    });

    return NextResponse.json({ usuarios: usuariosCompletos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

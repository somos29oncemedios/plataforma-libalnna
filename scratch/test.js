import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
      .from('partidos')
      .select(`
        *,
        equipo_local:equipos!equipo_local_id(nombre, correo_electronico),
        equipo_visitante:equipos!equipo_visitante_id(nombre, correo_electronico)
      `)
      .limit(1);
      
  console.log(JSON.stringify({ data, error }, null, 2));
}

test();

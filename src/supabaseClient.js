import { createClient } from "@supabase/supabase-js";

// Los valores salen del archivo .env (ver env.example).
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. " +
      "Copia env.example como .env y pega tus valores de Supabase."
  );
}

export const supabase = createClient(url, key);

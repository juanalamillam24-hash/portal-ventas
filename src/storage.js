import { supabase } from "./supabaseClient";

/*
  Capa de almacenamiento sobre Supabase.
  Reemplaza a window.storage del artefacto, manteniendo la misma forma:
    get(key)  -> { value } | null
    set(key, value) -> true
  Los valores se guardan como texto (JSON string), igual que antes.
  Todo se guarda en la tabla "kv" (ver supabase/schema.sql).
*/

export async function get(key) {
  const { data, error } = await supabase
    .from("kv")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data ? { value: data.value } : null;
}

export async function set(key, value) {
  const { error } = await supabase
    .from("kv")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
  return true;
}

export default { get, set };

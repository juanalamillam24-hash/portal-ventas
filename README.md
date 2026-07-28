# Portal de Ventas · NEXUS ELITE

Sistema de embudo, ventas y cartera para el equipo comercial. Tiene vista de
agente y vista de directora. Los datos viven en **Supabase** (base de datos real).

## Qué hay dentro

| Pestaña | Para qué sirve |
|---|---|
| **Prioridad** | A quién llamar hoy: pagos vencidos, pagos comprometidos y zooms del día. |
| **Membresía** | Clases y zooms a los que asistió cada cliente. |
| **Ventas** | Una línea por servicio vendido, con desglose por servicio y ranking por agente. |
| **Cartera** | Ventas con saldo pendiente, ordenadas por vencimiento. |
| **Configuración** | Catálogo de servicios y comisiones (solo la directora). |

---

## Parte 1 · Crear la base de datos en Supabase

1. Entra a https://supabase.com y crea una cuenta gratis.
2. Haz clic en **New project**. Ponle un nombre (ej. `portal-ventas`) y una
   contraseña de base de datos (guárdala en un lugar seguro). Elige la región
   más cercana y espera 1–2 minutos.
3. En el menú de la izquierda entra a **SQL Editor** → **New query**.
4. Abre `supabase/schema.sql` de este proyecto, copia **todo** su contenido,
   pégalo en el editor y presiona **Run**. Debe decir "Success".
5. Entra a **Project Settings** (el engranaje) → **API**. Ahí verás:
   - **Project URL** → es tu `VITE_SUPABASE_URL`
   - **anon public** key → es tu `VITE_SUPABASE_ANON_KEY`

---

## Parte 2 · Correrlo en tu computador

```bash
npm install
cp env.example .env     # y pega los dos valores de la Parte 1
npm run dev
```

Abre la dirección que aparece en la terminal (normalmente http://localhost:5173).

## Parte 3 · Publicarlo

```bash
npm run build
```

Eso genera la carpeta `dist/`, que es lo que se sube a Cloudflare Pages, Vercel
o Netlify. Recuerda configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
como variables de entorno también en el sitio donde publiques.

---

## Advertencias pendientes

Estos puntos están identificados pero **todavía no corregidos** en este código:

1. **Riesgo de pérdida de datos en la migración.** `loadKey` devuelve el valor
   por defecto tanto si la clave no existe como si el JSON está dañado. Como el
   valor por defecto de ventas es `null` y eso dispara la migración con un
   guardado inmediato, una lectura fallida puede sobrescribir todas las ventas.
2. **Los productos se referencian por nombre, no por id.** Renombrar un servicio
   en Configuración desconecta las ventas históricas y cambia sus comisiones.
3. **Cambiar la etapa reinicia el contador de "estancado"**, sin que haya avance
   real del cliente.
4. **El acceso no tiene contraseña.** Cualquiera que abra la app puede entrar
   como Directora y ver el consolidado de todo el equipo. La política de RLS de
   `supabase/schema.sql` también deja leer y escribir a cualquier visitante.

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

## Parte 1 · La base de datos

**Ya está lista, no tienes que hacer nada.** Este proyecto usa el mismo Supabase
que `elitenexus` (`nexus-elite`), donde la tabla `kv` ya existe. Las dos apps
conviven sin pisarse porque usan claves distintas:

| App | Claves que escribe |
|---|---|
| elitenexus | `chk:…`, `steps:…` |
| portal-ventas | `nexus-embudo-clientes`, `nexus-embudo-ventas`, `nexus-embudo-productos`, `nexus-embudo-migrado` |

Lo único que necesitas de Supabase son dos valores para el paso siguiente. Están
en **Project Settings** (el engranaje) → **API**:

- **Project URL** → es tu `VITE_SUPABASE_URL`
- **anon public** key → es tu `VITE_SUPABASE_ANON_KEY`

Solo si algún día quieres montarlo en un Supabase aparte: crea el proyecto, entra
a **SQL Editor** → **New query**, pega todo el contenido de `supabase/schema.sql`
y presiona **Run**.

---

## Parte 2 · Correrlo en tu computador

```bash
npm install
cp env.example .env     # y pega los dos valores de la Parte 1
npm run dev
```

Si te falta el `.env`, la app lo dice con un error claro en vez de fallar en
silencio.

Abre la dirección que aparece en la terminal (normalmente http://localhost:5173).

## Parte 3 · Publicarlo

```bash
npm run build
```

Eso genera la carpeta `dist/`, que es lo que se sube a Cloudflare Pages, Vercel
o Netlify. Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como
variables de entorno también en el sitio donde publiques.

---

## Ya corregido

- **La migración ya no puede sobrescribir ventas.** Una lectura fallida antes se
  confundía con "no hay nada guardado" y disparaba la migración. Ahora un dato
  dañado lanza un error, la migración solo corre en una instalación virgen y
  deja una bandera (`nexus-embudo-migrado`) para no repetirse. Si la carga
  falla, la app se bloquea en vez de dejarte trabajar sobre datos vacíos.
- **Los servicios se referencian por id.** Renombrar un servicio en
  Configuración ya no desconecta las ventas históricas ni altera sus comisiones;
  el nombre nuevo se refleja en todas las pantallas.

## Pendiente

1. **Cambiar la etapa reinicia el contador de "estancado"**, sin que haya avance
   real del cliente.
2. **El acceso no tiene contraseña.** Cualquiera que abra la app puede entrar
   como Directora y ver el consolidado de todo el equipo. Peor: la política RLS
   de `supabase/schema.sql` es `FOR ALL TO anon USING (true)`, así que la clave
   anon —que es pública por diseño— permite leer y borrar toda la tabla desde
   fuera de la app. Arreglarlo requiere Supabase Auth en este proyecto **y** en
   elitenexus, que comparten la misma tabla.

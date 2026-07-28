# Guía del Portal de Ventas

Todo lo que hace el sistema, explicado en orden. No necesitas saber programar
para leer esto.

---

## 1. Qué es y para qué sirve

El portal responde una sola pregunta, todos los días: **¿a quién hay que
llamar hoy y por cuánto?**

Para eso guarda tres cosas distintas, que conviene no confundir:

| Cosa | Qué es | Dónde vive |
|---|---|---|
| **Cliente** | Una persona en el embudo, con su teléfono y su etapa. | Pestaña Prioridad y Membresía |
| **Venta** | Un servicio vendido, con su monto y su fecha de pago. | Pestaña Ventas |
| **Servicio** | Un producto del catálogo, con su precio y su comisión. | Pestaña Configuración |

La clave: **un cliente puede tener varias ventas**. Carolina puede comprar Oro
y además Bot IA — son dos líneas separadas, cada una con su propio saldo y su
propia fecha de pago. Por eso los montos no viven en la ficha del cliente.

---

## 2. Cómo entrar

Abres la página y ves dos opciones:

- **Entrar como Directora** — ves a los 20 agentes.
- **Tu nombre en la lista** — ves solo tus clientes y tus ventas.

No hay contraseña todavía. Cualquiera que abra la página puede entrar como
quien quiera, incluida la Directora. Es la limitación más importante del
sistema hoy y está explicada en la sección 11.

---

## 3. El encabezado: quién eres y qué estás viendo

Arriba de todo, a la derecha, la Directora tiene un selector:

- **Vista consolidada (todos)** — suma los datos de los 20 agentes. Aparecen
  columnas extra de "Agente" y el ranking del equipo.
- **Un agente concreto** — ves exactamente lo que ve esa persona.

**Ojo con esto:** en vista consolidada **no puedes crear clientes ni ventas**.
El sistema no sabría a nombre de quién ponerlos, así que te avisa y no te deja.
Para crear algo, primero elige un agente en el selector.

Al lado están el botón de recargar (⟳), la campana con el número de alertas, y
Salir.

---

## 4. Los cuatro números de arriba

Están en todas las pestañas y salen **siempre de las ventas**, nunca de las
fichas de clientes. Esto es lo que significa cada uno, exactamente:

| Número | Cómo se calcula | Cuidado con |
|---|---|---|
| **Facturado** | Suma del monto de **todas** las ventas. | Incluye las marcadas como "Posible", que todavía no están confirmadas. Es el número más optimista de los cuatro. |
| **Cobrado** | Si la venta está pagada, su monto completo. Si no, lo que se haya abonado. | Es dinero que ya entró. |
| **Saldo en cartera** | Lo que falta por cobrar: monto menos abono, en las ventas no pagadas. | Las ventas pagadas cuentan como cero. |
| **Comisión causada** | Comisión de las ventas **ya pagadas**. Debajo, en pequeño, aparece la **proyectada**, que incluye todas. | La causada es la que de verdad se debe. La proyectada es una estimación. |

---

## 5. La franja de alertas

Justo debajo aparecen las cosas que no pueden esperar. Solo salen dos tipos:

**Zoom 1 a 1 hoy** — el cliente está en la etapa *Zoom 1 a 1* **y** su fecha de
zoom es hoy. Si la fecha está puesta pero la etapa es otra, la alerta no
aparece. Las dos condiciones tienen que cumplirse.

**Pagos** — cualquier venta sin pagar cuya fecha de pago sea hoy, mañana, en
dos días, o ya esté vencida. Más allá de dos días no alerta.

Las vencidas y las de hoy salen en rojo y primero. Cada alerta trae un botón de
**WhatsApp** que abre el chat con un mensaje ya escrito. Si el cliente no tiene
teléfono, dice "Sin teléfono registrado".

---

## 6. Pestaña PRIORIDAD

Es la pantalla principal: con quién hablar hoy.

### Arriba: la foto del embudo

Siete casillas con cuántos clientes hay en cada etapa: Beca, Usa Servicios,
Zoom Masivo, Zoom 1 a 1, Abono, Fecha de Pago, Pago Completo. Solo informan,
no se hace clic en ellas.

### Abajo: los clientes en cuatro grupos

El sistema reparte a **todos** tus clientes en estos cuatro cajones. Cada
cliente cae en uno solo:

**🔴 Hoy** — pagos vencidos, pagos comprometidos para hoy, y zooms 1 a 1 de
hoy. Ordenados por lo más atrasado primero, y a igualdad de días, por el saldo
más grande. *Este grupo es tu lista de llamadas.*

**🟡 Estancados +48h** — clientes que llevan más de 48 horas sin ningún
movimiento **y** que no tienen registrada ninguna clase, ningún zoom y ninguna
venta. Es decir: entraron y ahí se quedaron. Ordenados por los más olvidados
primero.

**🟨 Próximos 7 días** — pagos comprometidos que vienen en los próximos siete
días. Los que están a más de siete días no aparecen aquí.

**⚪ Al día** — todo lo demás. Nada urgente por ahora.

### Cada fila, de izquierda a derecha

- **Nombre del cliente** — haz clic y se abre su ficha para editarla.
- Debajo: agente (solo en vista consolidada), teléfono, avance
  (`4/6 · 3/4` = cuatro de seis clases, tres de cuatro zooms) y cuánto lleva
  sin moverse.
- **Etiquetas de color** con el motivo por el que está en ese grupo.
- **Saldo** — lo que ese cliente debe en total, sumando todas sus ventas.
- **Selector de etapa** — la cambias ahí mismo, sin abrir la ficha.
- **WhatsApp** — abre el chat. Si el cliente debe dinero, el mensaje ya
  menciona el saldo; si no, es un mensaje de acompañamiento.

---

## 7. Pestaña MEMBRESÍA

Para llevar el control de a qué asistió cada cliente.

Arriba, cuatro contadores: clases asistidas en total, zooms asistidos, cuántos
clientes no tienen ningún avance, y cuántos completaron las seis clases (con su
porcentaje).

Puedes **buscar por nombre** y **filtrar**:

- *Todos*
- *Sin ningún avance* — cero clases y cero zooms.
- *Clases en curso* — empezó pero no ha terminado las seis.
- *Clases y zooms completos* — las seis clases **y** los cuatro zooms.

En cada tarjeta marcas con un clic:

- **Clases 1 a 6** — círculos que se ponen dorados al marcarlos.
- **Zooms** — Masivo 1, Masivo 2, 1 a 1, Cierre.

Se guarda solo, al instante. Vuelves a hacer clic y se desmarca.

---

## 8. Pestaña VENTAS

Aquí se registra el dinero. **Una línea por servicio vendido.**

### Reportar una venta

Botón *Reportar venta*. Los campos:

| Campo | Para qué |
|---|---|
| **Agente que vendió** | Solo lo ve la Directora. |
| **Cliente del embudo** | Si eliges uno de la lista, la venta queda enlazada a su ficha y hereda su teléfono. Opcional. |
| **Nombre del cliente** | Obligatorio. Se rellena solo si elegiste uno de la lista. |
| **Servicio vendido** | Obligatorio. Al elegirlo se precarga el precio del catálogo, que puedes cambiar. |
| **Monto total** | Obligatorio, mayor que cero. |
| **Abono recibido** | Lo que ya pagó. No puede ser mayor que el monto. |
| **Tipo** | *Agendado* (confirmado) o *Posible*. |
| **Fecha de pago** | Cuándo se comprometió a pagar. De aquí salen las alertas. |
| **Observaciones** | Notas libres. |

Mientras escribes, el sistema te muestra el **saldo pendiente** calculado.

### La tabla

Cada venta con su cliente, servicio, monto, abono, saldo, fecha y estado.
Directamente en la tabla puedes editar el **abono** y la **fecha de pago** sin
abrir nada. Los tres botones al final de cada fila:

- **✓** — marca como pagada, o la devuelve a pendiente.
- **✎** — abre la venta completa para editarla.
- **🗑** — la elimina, con confirmación.

Filtros arriba: todas, con saldo pendiente, pagadas, o posibles.

### Las dos tablas de abajo

- **Ventas por servicio** — cuántas unidades, cuánto facturado y cuánto
  cobrado de cada producto. Te dice qué se vende de verdad.
- **Ranking por agente** — solo en vista consolidada. Ordenado por facturado,
  con la comisión causada de cada uno.

---

## 9. Pestaña CARTERA

Es la pestaña de cobranza: **solo las ventas que aún deben dinero**, ordenadas
por vencimiento, lo más urgente arriba. Las que no tienen fecha van al final.

Arriba: cuántos clientes en cartera, saldo total, cuánto está vencido, y
cuántas ventas no tienen fecha de pago puesta (esas son las peligrosas: nadie
las va a perseguir porque nunca alertan).

Cada tarjeta se puede trabajar sin salir de ahí:

- **Abono recibido** — actualizas lo que acaba de pagar.
- **Fecha de pago** — mueves el compromiso.
- **Observaciones** — "pide llamar en la tarde", lo que sea.
- **Pago completo** — botón verde que salda la venta de un golpe.
- **WhatsApp** — mensaje de cobro con el saldo ya escrito.

El borde y la etiqueta cambian de color: rojo si está vencida, dorado si vence
hoy, gris si viene más adelante.

---

## 10. Pestaña CONFIGURACIÓN (solo Directora)

El catálogo de servicios. Cada uno tiene:

- **Nombre**, **Precio** (se precarga al vender), **Tipo** (Membresía, Upgrade
  u Otro, que agrupa el desplegable al vender).
- **Comisión fija** — cuánto gana el agente por vender ese servicio.
- **Activo (●/○)** — desactivarlo lo saca del formulario de venta pero **no
  toca el histórico**.

### Cómo se calcula la comisión

> Si el servicio tiene **comisión fija mayor que cero**, se usa esa cifra.
> Si está en **cero**, se calcula el **25% del monto de la venta**.

Todos los servicios vienen con comisión fija en 0, así que hoy **todo el
sistema está comisionando al 25%**. Si quieres comisiones distintas por
producto, ponlas ahí.

Puedes renombrar un servicio sin miedo: las ventas ya registradas siguen
enlazadas y el nombre nuevo se refleja en todas las pantallas.

---

## 11. Cosas que conviene saber antes de usarlo en serio

**No hay contraseña.** Cualquiera con el enlace entra como Directora y ve el
consolidado del equipo, con teléfonos de clientes, montos y comisiones. Además,
la base de datos permite lectura y escritura a cualquier visitante. Es el punto
pendiente más serio.

**El abono se puede pasar del monto.** El formulario de venta lo impide, pero
si editas el abono directamente en la tabla de Ventas o en Cartera, no hay
validación. Si escribes 900 en una venta de 789, el saldo se muestra en cero
(bien) pero el número de **Cobrado** sube a 900 (mal). Corrígelo desde el
formulario si pasa.

**Al borrar un cliente, sus ventas se quedan.** Siguen contando en Finanzas
pero ya no tienen ficha detrás. El sistema te avisa antes de borrar.

**Cambiar la etapa reinicia el contador de "estancado".** Mover el selector
cuenta como movimiento aunque el cliente no haya avanzado nada, así que ese
cliente desaparece del grupo de Estancados durante 48 horas.

**No hay historial.** Si alguien cambia un monto o borra una venta, no queda
registro de quién ni cuándo.

**"Facturado" incluye las ventas Posibles.** Para saber el negocio confirmado,
mira Cobrado y Saldo en cartera.

---

## 12. Tres rutinas típicas

**Tu día normal.** Abres Prioridad. Trabajas el grupo **Hoy** de arriba abajo
usando el botón de WhatsApp. Miras **Estancados** y rescatas a uno o dos. Lo
que cobres, lo registras en Cartera.

**Entra un cliente nuevo.** Prioridad → *Nuevo cliente* → nombre, teléfono
(con indicativo, ej. `57...`) y etapa. Cuando asista a algo, lo marcas en
Membresía.

**Cierras una venta.** Ventas → *Reportar venta* → eliges el cliente del
embudo, el servicio, el monto, lo que abonó y la fecha en que pagará el resto.
Desde ese momento aparece en Cartera y alertará sola cuando toque.

---

## 13. Dónde vive todo

- **La página:** https://juanalamillam24-hash.github.io/portal-ventas/
- **El código:** https://github.com/juanalamillam24-hash/portal-ventas
- **Los datos:** Supabase, proyecto `nexus-elite`, tabla `kv`. La comparte con
  elitenexus sin pisarse, porque cada app usa claves distintas.
- **Actualizaciones:** cada cambio subido al repositorio se publica solo, en
  aproximadamente un minuto.

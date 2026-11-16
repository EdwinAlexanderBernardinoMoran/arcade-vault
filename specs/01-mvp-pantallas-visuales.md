# SPEC 01 — MVP visual: todas las pantallas de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** ninguna
> **Fecha:** 2026-11-16
> **Objetivo:** Portar las 5 pantallas de `references/templates/` (biblioteca, detalle, reproductor, auth y salón de la fama) a rutas reales de Next.js App Router, solo la parte visual y con datos mock.

---

## Por qué existe este spec

`references/templates/` es un prototipo SPA en React UMD + Babel, con rutas guardadas en `location.hash`. El proyecto real es Next.js 16 con App Router, TypeScript estricto y Tailwind v4. Este spec traduce el prototipo a esa arquitectura sin cambiar el aspecto. Los juegos reales, el backend y la autenticación real quedan fuera.

`app/globals.css` ya contiene los estilos migrados de la plantilla (clases `.card`, `.btn`, `.av-grid`, `.crt`, `.podium`, etc., más variables y `@keyframes`). Este spec los reutiliza y no los reescribe.

---

## Alcance

**Dentro:**

- 5 pantallas como rutas del App Router: `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`.
- Nav (con panel móvil) y footer compartidos en `app/layout.tsx`.
- Datos mock tipados en TypeScript: 8 juegos, categorías, generador `seededScores`.
- Sesión falsa con `localStorage` (`av_user`): cualquier usuario y contraseña entra, y "Jugar como invitado" deja la sesión vacía.
- Puntuaciones guardadas en `localStorage` (`av_scores`) desde el modal de fin de juego.
- Reproductor con la simulación de la plantilla: HUD, puntaje aleatorio cada 220 ms, pausa, fin de juego y modal para guardar puntuación. El área de juego es solo el marco CRT con decoración.
- Búsqueda por nombre y filtro por categoría en la biblioteca.
- Los componentes reutilizan las clases de `globals.css`. Tailwind se usa para layout y ajustes puntuales.
- Página 404 para ids de juego inexistentes (`notFound()`).

**Fuera de alcance (para otros specs):**

- Cualquier juego real (lógica, canvas, controles).
- Backend, base de datos y API de puntuaciones.
- Autenticación real (OAuth Google/GitHub, hash de contraseñas, validación de credenciales). Los botones sociales son decorativos.
- Mostrar en el Salón de la Fama las puntuaciones guardadas en `av_scores`. El salón sigue con datos `seededScores`, igual que la plantilla.
- Contador de créditos funcional. El nav muestra `CRÉDITOS · 03` fijo.
- Tests automatizados (el repo no tiene ejecutor de pruebas).
- Reescribir `globals.css` a utilidades Tailwind.
- SEO avanzado, i18n, analítica.

---

## Modelo de datos

Los datos son mock y viven en `lib/`. Con el alias `@/*` apuntando a la raíz, no hay carpeta `src/`.

```ts
// lib/games.ts
export type GameColor = "cyan" | "magenta" | "green" | "yellow";
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string; // slug, p. ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS de globals.css, p. ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string; // texto ya formateado, p. ej. "12.4K"
}

export const GAMES: Game[]; // los 8 juegos de data.jsx
export const CATS: ("TODOS" | GameCategory)[];

// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
} // date: "dd/mm/2026"
export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, mismo algoritmo que data.jsx

// lib/session.tsx (cliente)
export interface SessionUser {
  name: string;
} // máx. 10 caracteres, mayúsculas
export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}
```

Claves de `localStorage`:

- `av_user` → `SessionUser | null` en JSON.
- `av_scores` → `SavedScore[]` en JSON.

Convenciones:

- Números con `toLocaleString("es-ES")`.
- Los ids de juego válidos salen de `GAMES`. Cualquier otro id dispara `notFound()`.
- Todo acceso a `localStorage` va dentro de `useEffect` o de manejadores de eventos, con `try/catch`. El primer render coincide con el del servidor para evitar errores de hidratación.

---

## Plan de implementación

Antes de empezar, leer la guía de Next.js correspondiente en `node_modules/next/dist/docs/` (rutas dinámicas con `params` asíncrono, `cacheComponents`, `generateStaticParams`, Client Components).

1. **Datos mock.** Crear `lib/games.ts` y `lib/scores.ts` con los tipos y los datos portados de `references/templates/data.jsx`. Verificar con `npm run lint` y que `globals.css` contiene las clases `cover-*` usadas por los juegos. Si falta alguna, anotarlo y añadirla.
2. **Sesión mock.** Crear `lib/session.tsx` (`"use client"`) con `SessionProvider`, el hook `useSession()` (`user`, `login`, `signOut`, `saveScore`) y lectura de `av_user` en `useEffect`.
3. **Layout compartido.** Crear `components/nav.tsx` (cliente, con panel móvil y estado activo según `usePathname()`) y `components/footer.tsx`. Montarlos en `app/layout.tsx` junto con `SessionProvider` y un `<main className="av-main">`. Verificar que las fuentes y el fondo actuales se conservan.
4. **Biblioteca (`/`).** Crear `components/game-card.tsx` (efecto tilt) y `components/library.tsx` (hero, búsqueda, chips, grilla, estado vacío). Reemplazar `app/page.tsx`. Las tarjetas enlazan a `/juegos/[id]`.
5. **Detalle (`/juegos/[id]`).** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams`, `await params`, `notFound()` y el marcado de `detalle.jsx` (portada, etiquetas, estadísticas, tabla de mejores puntuaciones). El botón principal enlaza a `/juegos/[id]/jugar`.
6. **Auth (`/auth`).** Crear `app/auth/page.tsx` y `components/auth-form.tsx` (cliente, pestañas entrar/crear cuenta, invitado, botones sociales decorativos). Tras enviar, llamar a `login` y navegar a `/` con `useRouter`.
7. **Salón de la Fama (`/salon`).** Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (cliente: pestañas por juego, podio, tabla y fila "TU MEJOR MARCA" si hay sesión).
8. **Reproductor (`/juegos/[id]/jugar`).** Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (cliente: HUD, simulación, pausa, fin, modal de guardado con `saveScore`, reiniciar). "SALIR" vuelve al detalle y "VOLVER AL VAULT" a `/`.
9. **Pulido responsive y accesibilidad básica.** Revisar 360 px, 768 px y 1280 px. Añadir `aria-label` a botones de solo icono, `alt` o `aria-hidden` donde corresponda y respetar `prefers-reduced-motion` (ya definido en `globals.css`). Añadir `app/not-found.tsx` con el estilo del vault.

Cada paso deja la app ejecutable con `npm run dev`.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores ni avisos de TypeScript.
- [ ] `/` muestra el hero y las 8 tarjetas de juego.
- [ ] Escribir "caí" en el buscador deja solo la tarjeta CAÍDA.
- [ ] Al elegir la categoría SHOOTER, la grilla muestra exactamente INVASORES y ROCAS.
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Pulsar una tarjeta o su botón JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/bloque-buster` muestra título, descripción larga, tres estadísticas y 10 filas de puntuaciones, con las 3 primeras con estilo de podio.
- [ ] `/juegos/no-existe` muestra la página 404.
- [ ] "JUGAR AHORA" lleva a `/juegos/<id>/jugar`, donde la puntuación sube sola cada ~220 ms.
- [ ] PAUSA detiene el puntaje y muestra "EN PAUSA". REANUDAR lo retoma.
- [ ] FIN abre el modal con la puntuación final. GUARDAR PUNTUACIÓN escribe una entrada en `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA".
- [ ] JUGAR DE NUEVO reinicia puntaje, vidas y nivel.
- [ ] En `/auth`, enviar el formulario con usuario "kai" guarda `av_user = {"name":"KAI"}`, navega a `/` y el nav muestra `KAI`.
- [ ] En la pestaña "CREAR CUENTA" aparece el campo de correo.
- [ ] "JUGAR COMO INVITADO" navega a `/` sin dejar `av_user` en `localStorage`.
- [ ] Tras recargar la página con sesión iniciada, el nav sigue mostrando el nombre y la consola no muestra errores de hidratación.
- [ ] Pulsar el nombre de usuario en el nav cierra la sesión y el nav vuelve a mostrar "Iniciar Sesión".
- [ ] `/salon` muestra podio y tabla de 12 filas. Cambiar de pestaña cambia los datos. La fila "TU MEJOR MARCA" aparece solo con sesión iniciada.
- [ ] A 360 px de ancho el nav muestra el botón hamburguesa, el panel móvil abre y cierra, y no hay scroll horizontal.
- [ ] No se implementa lógica de ningún juego real.

---

## Decisiones

- **Sí:** rutas reales del App Router. Dan URLs compartibles y encajan con Next.js. **No:** router propio por hash como en la plantilla, porque contradice la arquitectura del proyecto.
- **Sí:** reutilizar las clases ya migradas en `globals.css` y usar Tailwind para layout. Conserva el resultado visual del prototipo con poco riesgo. **No:** reescribir todo a utilidades Tailwind, por el costo alto y el riesgo de diferencias visuales.
- **Sí:** sesión y puntuaciones mock en `localStorage`, igual que la plantilla. El spec es solo visual. **No:** backend ni auth real, que van en otro spec.
- **Sí:** mantener la simulación del reproductor. El marco CRT, el HUD y el modal quedan listos para montar juegos reales después. **No:** pantalla estática "próximamente".
- **Sí:** `lib/` para datos y `components/` para UI. **No:** carpetas privadas dentro de `app/`.
- **Sí:** el Salón de la Fama sigue con `seededScores`. Mezclarlo con `av_scores` espera a tener backend.
- **Sí:** `generateStaticParams` para `/juegos/[id]`, ya que los ids son un conjunto cerrado de 8.

---

## Riesgos

| Riesgo                                                                                     | Mitigación                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Errores de hidratación al leer `localStorage` en el primer render                          | Leer solo en `useEffect`. El primer render muestra el estado de invitado.                                                      |
| `cacheComponents: true` cambia la semántica de datos dinámicos y `params`                  | Leer la guía en `node_modules/next/dist/docs/` antes del paso 5. Los datos mock son estáticos, así que no hay acceso dinámico. |
| Faltan clases en `globals.css` (`cover-*`, `.podium`, `.modal`) o difieren de la plantilla | Revisar en el paso 1 contra `references/templates/styles.css` y corregir `globals.css` solo donde falte algo.                  |
| `localStorage` bloqueado (modo privado)                                                    | `try/catch` en cada lectura y escritura. La app sigue funcionando sin persistir.                                               |
| `seededScores` con `Math.random` o fechas causa diferencias servidor/cliente               | `seededScores` es determinista. La simulación de puntaje aleatorio vive solo en un Client Component dentro de `useEffect`.     |

---

## Lo que **no** está en este spec

- Ningún juego real (Bloque Buster, Caída, Serpentina, etc.).
- Backend, base de datos y API de puntuaciones.
- Autenticación real y OAuth.
- Salón de la Fama alimentado por las puntuaciones guardadas.
- Créditos funcionales.
- Tests automatizados.

Cada uno, si se hace, va en su propio spec.

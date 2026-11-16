# CLAUDE.md

Este archivo brinda orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Proyecto

Arcade Vault: una plataforma en línea para jugar y competir por la mayor cantidad de puntos. El proyecto sigue Spec Driven Design (flujo `/spec` y `/spec-impl`, con skills de `Klerith/fernando-skills`, instaladas mediante `npx skills@latest add Klerith/fernando-skills`). Actualmente el código es una plantilla recién generada con Create Next App (solo `app/page.tsx` y `app/layout.tsx`).

## Comandos

- `npm run dev` — servidor de desarrollo (Turbopack) en http://localhost:3000
- `npm run build` / `npm run start` — compilar para producción / servir la build
- `npm run lint` — ESLint (configuración flat en `eslint.config.mjs`, usa `eslint-config-next`)
- Aún no hay un ejecutor de pruebas configurado.

## Skills

Usa siempre /frontend-design para diseñar interfaces de usuario.

## Advertencia sobre la versión de Next.js

Next.js 16.4.6 con React 19.3: tiene cambios incompatibles respecto a versiones anteriores. Según `AGENTS.md`, lee la guía correspondiente en `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, ...) antes de escribir código de Next.js y presta atención a los avisos de deprecación. `next dev` regenera `AGENTS.md` automáticamente.

## Notas de arquitectura

- Solo App Router (`app/`). El alias de ruta `@/*` apunta a la raíz del repositorio.
- `next.config.ts` activa funciones no predeterminadas: `cacheComponents: true`, `partialPrefetching: true` y `experimental.agentFeedback`. `cacheComponents` cambia la semántica de caché y renderizado (el acceso a datos dinámicos debe manejarse explícitamente, p. ej. dentro de Suspense); consulta la documentación antes de obtener datos en páginas o layouts.
- Tailwind CSS v4 está conectado mediante reglas de Turbopack (loader `@tailwindcss/turbopack` para `*.css`) en lugar de PostCSS; los estilos parten de `@import "tailwindcss"` en `app/globals.css`, con los tokens de tema en `@theme inline`.
- El layout raíz usa el tipo global generado `LayoutProps<"/">` (no requiere importación) y carga las fuentes Geist con `next/font/google`.
- TypeScript está en modo `strict`.

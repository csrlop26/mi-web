# AugustoCS web-v2 — Reescritura de contenido y saneamiento de imágenes

**Fecha**: 2026-07-14
**Alcance**: `web-v2` (portafolio + servicios de César / AugustoCS)

## Contexto

`web-v2` parte de una copia de `web` (v1) con hero, navbar, cursor y about-drawer
rediseñados. El resto de componentes (Projects, Journal, Contact, Studio, Demos)
son idénticos a v1. El copy actual proviene de la traducción al español de un
template de agencia (Framer/Webflow, marca "byhuy"), y arrastra tres problemas
que bloquean publicar el sitio tal cual:

1. **Contenido falso**: testimonios de clientes que no existen
   (Mammoth Murals, Supersolid Agency, OH Architecture — no aparecen en
   `PROJECTS`), año de fundación inventado ("Est. 2022").
2. **Enlaces rotos/ajenos**: el CTA "Agendar llamada" apunta a
   `cal.com/byhuy`, que no es de César.
3. **Assets robados**: varias imágenes/vídeos están hotlinkeados directamente
   del CDN del estudio origen del template (`cdn.prod.website-files.com`,
   `byhuy.b-cdn.net`), incluyendo una foto de una persona real presentada
   como si fuera César. Esto es tanto un riesgo de derechos como de
   suplantación de identidad — no es negociable, hay que quitarlo.

Servicios reales del negocio (contexto del emprendimiento):
- Activos: diseño/creación de páginas web, gestión y optimización de tiendas
  Shopify, creación de contenido digital/comercial.
- En proceso (no listos para vender aún): chatbots, automatización de tareas
  empresariales, adaptación de IA a pequeños negocios.

## Decisiones (confirmadas con el usuario)

- **Alcance de contenido**: reescritura completa del copy (hero, filosofía,
  servicios, about, proceso, FAQ, footer, contacto). Journal y Demos quedan
  fuera de esta ronda (Journal ya tiene enfoque SEO local coherente; Demos
  catalog está vacío y no se renderiza).
- **Testimonios**: se elimina la sección entera (sin citas inventadas, sin
  placeholders "TODO" visibles). Sustituida por la sección de servicios
  ampliada (ver abajo).
- **Precio**: no se muestra ningún número en la web. El FAQ se reenfoca a
  quién trabaja en el proyecto, cuánto tarda y cómo es el proceso; el precio
  se negocia por contacto directo. Se elimina la frase de escasez falsa
  ("2 proyectos por trimestre").
- **CTA de contacto**: se sustituye "Agendar llamada" (cal.com/byhuy) por dos
  canales reales: email (`cesarl@augustocs.com`, ya funcional vía
  formsubmit.co) y WhatsApp (`+34 624 169 459`).
- **Año de fundación**: no se muestra ("Est. 2022" era falso; año real 2025,
  demasiado reciente para presentarlo como señal de trayectoria). Se
  reemplaza por un ángulo de posicionamiento: estudio joven, al día con
  herramientas y estrategias actuales (IA, stack moderno), sin la carga de
  una agencia tradicional.
- **Historia personal (About)**: motivo real de fondo — César vio negocios
  locales de Castellón con webs anticuadas que no reflejaban la calidad real
  de su trabajo. Ese es el gancho del párrafo de apertura del About.
- **Voz**: mixta. Plural ("nosotros/el estudio") en servicios y proceso.
  Primera persona ("yo/César") en la bio del About.
- **Clientes vs demos**: en el About, se separan en dos listas explícitas:
  - Clientes reales: Robot Energy & Peace, Madre Superiora Coffee, AutoTietz.
  - Proyectos demo/concepto: B2Tech, Nova Restaurante, Odentrics,
    La Trattoria (coinciden con `isDemo: true` en `data.ts`).
- **Servicios**: se consolidan en **4 pilares** (ni 3 —muy poco— ni 6 —genérico
  de agencia—):
  1. Diseño & Desarrollo Web
  2. Shopify / E-commerce
  3. Contenido Digital
  4. Automatización & IA (encuadrado como "en desarrollo activo", sin
     prometer entrega inmediata — cubre chatbots/automatización/IA sin
     comprometerse a fecha).
- **StudioSection ("Filosofía de Estudio")**: se recorta para no duplicar la
  lista de 4 servicios. Se queda como declaración de filosofía breve (la cita
  grande), sin repetir el desglose de pilares.

## Estrategia de imágenes

| Uso | Estado actual | Acción |
|---|---|---|
| Thumbnails de los 7 proyectos (`public/*.webp`) | Ya existen localmente, reales | Verificar calidad, mantener, no regenerar |
| Key visual del Hero | Hotlink robado (website-files.com) | Generar con IA, estilo editorial B&N/grano de película, mismo tono que el actual |
| Vídeo loop reutilizado 3 veces (sección Filosofía, fondo CTA final, About drawer) | Hotlink robado (byhuy.b-cdn.net) | Generar o buscar en stock de licencia libre un loop abstracto de tono equivalente |
| 6 thumbnails hover de servicios | Hotlink robado (website-files.com) | Generar con IA, uno por cada uno de los 4 servicios nuevos (ya no 6) |
| Foto de "César" en FAQ card + tag del About | Foto robada de una persona real ajena | Reemplazar por `public/logo-normal.png` / `logo-negative.png` (ya existen) — nunca una cara falsa haciéndose pasar por César |
| Testimonios (3 headshots) | Hotlink robado | N/A — sección eliminada |

Regla general: ninguna imagen decorativa se genera para representar a una
persona real (ni César ni clientes). Fotos de personas solo si son reales y
provistas por el usuario; mientras tanto, placeholder de marca.

## Archivos afectados (referencia para el plan de implementación)

- `src/App.tsx` — hero copy, sección filosofía/pilares, sección
  servicios+testimonios (reestructurar a solo servicios), FAQ, CTA final,
  key visual, vídeo loop (2 usos), 6 imágenes hover de servicio.
- `src/components/AboutDrawer.tsx` — bio, principios, proceso, listas de
  clientes/demos, "Est. 2022", vídeo loop, foto.
- `src/components/HireModal.tsx` — fuera de alcance salvo que el usuario
  pida cambios (mantiene "Consulta de Diseño"); revisar si el copy de pasos
  sigue siendo coherente sin el CTA de cal.com en el resto del sitio.
- `src/components/StudioSection.tsx` — recorte para evitar duplicar los 4
  servicios.
- `src/data.ts` — sin cambios de estructura; los `PROJECTS` ya reflejan
  correctamente `isDemo`.
- Footer / navbar — cualquier referencia a "agendar llamada" se actualiza a
  email/WhatsApp.

## Fuera de alcance

- `JournalSection` / posts del blog.
- `DemosSection` (catálogo vacío, no se renderiza).
- Contenido de `web` (v1) — solo se toca `web-v2`.
- Sesión de fotos real de César (pendiente del usuario).

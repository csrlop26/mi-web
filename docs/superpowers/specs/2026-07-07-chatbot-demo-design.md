# Diseño: motor de chatbot personalizado (demo widget) — AugustoCS

## Contexto y objetivo

AugustoCS (emprendimiento de diseño web del usuario) quiere sumar "soluciones digitales" a su oferta, empezando por chatbots personalizados para pymes (restaurantes, peluquerías, comercios, consultorios). Antes de tener un cliente real, se necesita una demo funcional que:

1. Sirva de pitch/showcase en la propia web de AugustoCS (widget de chat embebido).
2. Sea el mismo motor que después se conecta a WhatsApp cuando haya un cliente real — sin reescribir nada, solo agregando un adaptador de canal nuevo.

## Decisiones previas (contexto de la conversación)

- Meta: piloto rápido, no plataforma multi-cliente compleja desde el día uno.
- Canal v1: solo widget web. WhatsApp queda para cuando haya un cliente real (requiere verificación de Meta Business).
- Plataforma: motor propio con Claude API (Haiku 4.5), en vez de Botpress o Hermes Agent — se descartaron por no dar control de código directo en este entorno (Botpress) o no estar pensado para bots de negocio con respuestas acotadas (Hermes Agent, un agente autónomo de propósito general).
- Hosting: Vercel (funciones serverless), sin infraestructura propia. Nota: el tier gratis de Vercel es para uso no comercial — al pasar a cliente real pagando, evaluar plan Pro.
- Rubro de la demo: restaurante ficticio.

## Arquitectura

```
[Widget en la web] --POST--> [/api/chat serverless] --> [Claude API (Haiku 4.5)]
                                     |
                                     v
                          [bots/<negocio>.json config]
```

- El "cerebro" del bot (function que construye el prompt y llama a Claude) está separado del canal. Hoy el canal es el widget web; más adelante se agrega un adapter de WhatsApp que llama a la misma función.
- Sin base de datos en v1. El historial de conversación vive en el estado del navegador (React state) y se manda completo en cada request, truncado a un máximo de turnos para controlar costo de tokens.
- Config por negocio: un archivo JSON por cliente. Agregar un cliente nuevo = agregar un archivo, no tocar código.

## Componentes

### 1. `bots/restaurante-demo.json` (config del negocio demo)

Schema:

```json
{
  "business_id": "restaurante-demo",
  "business_name": "string",
  "business_type": "restaurante",
  "tone": "string — instrucción de tono para el prompt",
  "hours": "string",
  "contact": { "phone": "string", "address": "string" },
  "menu": [{ "item": "string", "price": "string", "description": "string" }],
  "faqs": [{ "question": "string", "answer": "string" }],
  "booking_enabled": true
}
```

`booking_enabled: true` en v1 solo significa que el bot puede pedirle al usuario nombre, teléfono y horario preferido para una reserva, y responder "listo, te confirmamos por [contacto]" — no hay integración real con ningún calendario todavía (eso es un paso futuro, cuando haya cliente real).

### 2. `api/chat.ts` (función serverless en Vercel)

- Recibe `POST { business_id: string, messages: {role: "user"|"assistant", content: string}[] }`.
- Carga `bots/<business_id>.json`. Si no existe, responde 404.
- Construye el `system` prompt combinando una plantilla fija (reglas: no inventar información que no esté en el config, no hablar de otros temas, ofrecer reserva cuando corresponda) con los datos del config.
- Llama a Claude Haiku 4.5 (`@anthropic-ai/sdk`), sin thinking (no lo necesita para este caso), effort bajo.
- Trunca `messages` a los últimos N turnos (a definir en el plan, ej. 10) antes de mandarlo al modelo, para controlar costo.
- Valida que cada mensaje de usuario no supere un largo máximo (ej. 1000 caracteres) — corta abuso de costo.
- Devuelve `{ reply: string }`.

### 3. `src/components/ChatWidget.tsx`

- Burbuja flotante (botón) + panel de chat que se abre/cierra.
- Mantiene el historial en estado de React.
- Al enviar un mensaje, hace POST a `/api/chat` con `business_id="restaurante-demo"` fijo (hardcodeado en la demo — en un cliente real este valor vendría de la config del embed).
- Muestra un indicador de "escribiendo..." mientras espera la respuesta.
- Se agrega a `src/App.tsx` para que aparezca en toda la web de AugustoCS.

## Flujo de datos (camino feliz)

1. Usuario abre el widget y escribe "¿hasta qué hora atienden?".
2. Widget agrega el mensaje al historial local y hace POST a `/api/chat` con `business_id` + historial completo.
3. La función carga `restaurante-demo.json`, arma el system prompt con los horarios reales del config.
4. Claude responde usando solo esa información.
5. Widget agrega la respuesta al historial y la renderiza.

## Manejo de errores

| Caso | Comportamiento |
|---|---|
| Error de red / rate limit / error de Claude API | Responder con mensaje de respaldo fijo: "No puedo responder en este momento, escribinos directamente a [contacto]." No reintentar automáticamente en v1. |
| `business_id` no existe en `bots/` | 404 desde la función; el widget muestra el mismo mensaje de respaldo. |
| Mensaje de usuario vacío o solo espacios | El widget no envía el request (validación en el cliente). |
| Mensaje de usuario demasiado largo | La función corta/rechaza antes de llamar a Claude, devuelve un mensaje pidiendo acortar. |
| Pregunta fuera de tema (no relacionada al negocio) | El system prompt instruye al modelo a redirigir amablemente al tema del negocio — comportamiento esperado del modelo, no lógica de código. |

## Testing / verificación

Antes de dar por terminada la demo, correr el dev server y probar a mano en el navegador:

- Camino feliz: saludo → pregunta de horario → pregunta de menú → pedido de reserva.
- Bordes: mensaje vacío, mensaje muy largo, pregunta fuera de tema, pregunta sobre datos que no están en el config (el bot no debe inventar).
- Que el widget se vea y funcione bien en mobile y desktop.

No hay tests automatizados en el alcance de v1 (proyecto es un sitio de marketing/demo, no una app con lógica compleja que amerite suite de tests todavía).

## Fuera de alcance de este spec (pasos futuros, no ahora)

- Adapter de WhatsApp (Meta Cloud API) — se diseña cuando haya un cliente real confirmado.
- Integración real de reservas con un calendario.
- Panel de administración para que el propio negocio edite su config sin tocar código.
- Multi-tenant con base de datos (hoy alcanza con archivos JSON en el repo).

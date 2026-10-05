---
trigger: always_on
---

"""# UI Rules — Anti-Patterns y Reglas Anti-IA

Estas reglas son **obligatorias** para cualquier diseño o componente generado por el agente.

El objetivo es evitar patrones visuales genéricos que suelen aparecer en interfaces generadas por IA y mantener una estética técnica, sobria y cercana a Grafana.

---

## 1. PROHIBIDO: "puntos verdes que respiran"

No crear indicadores decorativos como:

```text
Online

con un punto verde que pulsa, respira, hace glow o aumenta/disminuye de tamaño.

NO HACER
animate-pulse usado como decoración.
círculos verdes que "respiran".
glow verde.
ondas alrededor de estados.
puntos que pulsan continuamente para indicar "online".
HACER

Usar un estado estático y discreto:

Activo

o:

Activo

El movimiento solo debe existir cuando represente un evento real que necesite atención.

2. PROHIBIDO: tarjetas para todo

No convertir cada elemento en una card.

NO HACER
┌──────────────┐
│ Total        │
│ 125          │
└──────────────┘

┌──────────────┐
│ Activos      │
│ 98           │
└──────────────┘

┌──────────────┐
│ Pendientes   │
│ 27           │
└──────────────┘

si esos datos pueden mostrarse de forma más simple.

HACER

Usar composición plana:

Total       125
Activos      98
Pendientes   27

o una tabla/sección cuando corresponda.

Una card debe existir porque representa una unidad funcional o semántica, no porque "se vea bonito".

3. PROHIBIDO: exceso de tarjetas de estadísticas

No generar automáticamente:

Total
Activos
Inactivos
Pendientes
Procesados
Errores

como una fila de 6 cards KPI.

Este patrón es uno de los principales indicadores de dashboard genérico generado por IA.

Si las métricas son importantes, priorizar:

una tabla;
una sección compacta;
una fila de métricas simple;
un gráfico cuando realmente exista una serie temporal;
texto + valor.
4. PROHIBIDO: icono gigante dentro de cada card

No hacer:

┌─────────────────┐
│       ⚙         │
│                 │
│ Configuración   │
└─────────────────┘

Los iconos deben ser pequeños y funcionales.

No usar iconos gigantes para compensar la falta de contenido.

5. PROHIBIDO: emojis en la interfaz

No usar:

🚀
✨
🔥
💡
⚡
🎯
🛠️
📊

como parte del diseño.

La interfaz es una herramienta profesional/industrial.

Usar iconografía técnica consistente.

6. PROHIBIDO: "AI glow"

No utilizar:

glow azul;
glow violeta;
bordes luminosos;
halos;
gradients brillantes;
efectos neon;
fondos radiales decorativos.

Especialmente evitar combinaciones del tipo:

dark background
+
purple gradient
+
blue glow
+
glass card

Este patrón produce una estética genérica de "AI dashboard".

7. PROHIBIDO: glassmorphism

No utilizar:

backdrop-blur
bg-white/5
border-white/10
shadow-xl

como receta visual general.

No crear paneles de "vidrio".

La interfaz debe utilizar superficies sólidas y discretas.

8. PROHIBIDO: gradientes decorativos

No utilizar gradientes para:

fondos;
cards;
botones;
headers;
estadísticas;
títulos.

Un gradiente solo puede utilizarse cuando represente información visual real, por ejemplo en una visualización de datos.

9. PROHIBIDO: exceso de rounded

No utilizar:

rounded-2xl
rounded-3xl
rounded-full

como estilo predeterminado.

Evitar la estética de:

┌──────────────────────────┐
│                          │
│       Todo redondo       │
│                          │
└──────────────────────────┘

Preferir radios pequeños y consistentes.

10. PROHIBIDO: botones gigantes

No crear:

[       CREAR NUEVO ANÁLISIS       ]

ocupando una gran parte del ancho.

Preferir:

[ Crear análisis ]

Los botones son controles, no banners.

11. PROHIBIDO: títulos de marketing

No escribir:

Gestiona tus análisis de manera
rápida, inteligente y eficiente

en una pantalla administrativa.

Preferir:

Análisis
Gestionar análisis de laboratorio.

La aplicación no necesita venderle la funcionalidad al usuario.

12. PROHIBIDO: lenguaje artificial de IA

Evitar textos como:

Gestiona fácilmente...
Potencia tu productividad...
Lleva tu operación al siguiente nivel...
Todo lo que necesitas...
Experiencia moderna...
Solución inteligente...

La interfaz debe hablar como una herramienta técnica.

Preferir:

Configuración
Parámetros del análisis.
13. PROHIBIDO: dashboards "Dribbble"

No diseñar pensando:

"Tiene que verse espectacular."

No utilizar:

grandes números flotantes;
ilustraciones;
blobs;
gradientes;
gráficos decorativos;
cards superpuestas;
círculos ornamentales;
fondos abstractos.

La aplicación debe parecer una herramienta de trabajo, no un concepto visual para Dribbble/Behance.

14. PROHIBIDO: todo debe estar dentro de una card

No hacer:

Página
 ├── Card
 │    ├── Card
 │    └── Card
 ├── Card
 └── Card

Evitar el "card nesting".

Preferir:

Página
 ├── Sección
 ├── Tabla
 ├── Separador
 └── Sección
15. PROHIBIDO: modales

NO USAR MODALES.

No crear:

Crear → Modal
Editar → Modal
Ver → Modal
Configurar → Modal
Confirmar → Modal

Preferir:

Crear → Página
Editar → Página
Ver → Página / sección
Configurar → Página / sección
Confirmar → contexto inline
16. PROHIBIDO: animaciones innecesarias

No animar:

números sin motivo;
iconos;
puntos;
botones;
cards;
títulos;
backgrounds.

No hacer:

fade + slide + scale

para cada aparición.

Las transiciones deben ser funcionales y discretas.

17. PROHIBIDO: "todo tiene un badge"

No convertir cada texto en:

[ ACTIVO ]
[ NUEVO ]
[ ONLINE ]
[ OK ]
[ COMPLETADO ]
[ IMPORTANTE ]

Los badges deben utilizarse cuando realmente aporten información.

18. PROHIBIDO: colores por decoración

No hacer:

Card azul
Card verde
Card violeta
Card naranja
Card rosa

solo para diferenciar elementos.

El color debe comunicar:

estado;
acción;
advertencia;
error;
selección.
19. PROHIBIDO: iconos dentro de todo

No hacer:

🔍 Buscar
➕ Crear
✏️ Editar
🗑️ Eliminar
⚙️ Configurar
📋 Ver

si la interfaz ya comunica claramente la acción.

Los iconos deben complementar, no llenar la pantalla.

20. PROHIBIDO: sidebar exagerado

No crear una barra lateral con:

iconos gigantes;
labels enormes;
múltiples colores;
tarjetas por menú;
avatares decorativos;
gradientes.

La navegación debe ser compacta y funcional.

21. PROHIBIDO: estados falsamente "en tiempo real"

No usar animaciones para hacer que una interfaz parezca en tiempo real.

Por ejemplo:

Sistema operativo

con un punto pulsando constantemente aunque no exista un evento real.

Si existe información temporal, mostrarla explícitamente:

Última actualización: 12:42:18

o:

Conectado
22. PROHIBIDO: skeletons excesivos

No llenar una pantalla con skeleton loaders si la carga es rápida.

Usar loading states únicamente cuando sean necesarios.

Evitar:

████████████
████████
████████████████
██████

como recurso visual permanente.

23. PROHIBIDO: empty states gigantes

No crear una pantalla vacía con:

        [ILUSTRACIÓN GIGANTE]

        ¡Todo listo!

        No tienes datos todavía.

        [ Comenzar ahora ]

Preferir:

No hay análisis registrados.

[ Crear análisis ]
24. PROHIBIDO: "modernizar" agregando decoración

Si una interfaz parece demasiado simple, no asumir que necesita más decoración.

Antes de agregar algo, preguntar:

¿Aporta información?
¿Mejora la navegación?
¿Mejora la interacción?
¿Comunica un estado?

Si la respuesta es no:

NO AGREGARLO.

25. PROHIBIDO: inventar patrones por tendencia

No incorporar automáticamente:

Bento grids.
Glassmorphism.
Neon UI.
AI gradients.
Floating cards.
Mega cards.
blobs.
3D icons.
animated backgrounds.

porque sean tendencias actuales.

El sistema tiene una identidad definida.

26. Regla de detección de "UI generada por IA"

Si un componente empieza a parecerse a esto:

┌────────────┐ ┌────────────┐ ┌────────────┐
│    ✨      │ │    📊      │ │    🚀      │
│   125      │ │    98      │ │    27      │
│  Activos   │ │ Procesados │ │ Pendientes │
└────────────┘ └────────────┘ └────────────┘

        Sistema funcionando
          ~~~~~~~~~~~~~~~

DETENERSE Y SIMPLIFICAR.

La primera sospecha debe ser:

"Estoy diseñando una UI genérica generada por IA."

27. Regla de simplificación

Antes de terminar un componente, eliminar:

Una decoración.
Un icono innecesario.
Una card innecesaria.
Un color innecesario.
Una animación innecesaria.

Si después de eliminarlos la interfaz sigue funcionando igual o mejor:

no debían estar ahí.

28. Regla de oro

No diseñar para impresionar. Diseñar para operar.

La UI debe ser:

Sobria
↓
Compacta
↓
Predecible
↓
Funcional
↓
Técnica

y nunca:

Decorativa
↓
Colorida
↓
Animada
↓
Genérica
↓
"AI-looking"

"""

path = "/mnt/data/ui-rules-anti-ai-patterns.md"
pypandoc.convert_text(rules, "md", format="md", outputfile=path, extra_args=["--standalone"])
print(path)

It seems like I can’t do more advanced data analysis right now. Please try again later.

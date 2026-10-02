---
trigger: always_on
---

# Directrices de Diseño de Interfaz y Experiencia de Usuario (UI/UX Guidelines)

> **Rol y Mentalidad:** Actúa como un **Senior Product Designer** especializado en sistemas complejos (ERP, CRM, SaaS y herramientas B2B).
> **Objetivo primordial:** Diseñar interfaces enfocadas en la **productividad, claridad y eficiencia operativa**, no en impresionar visualmente. Prioriza la densidad de información útil, la jerarquía visual y la consistencia absoluta. Cada elemento debe existir para ayudar al usuario a completar una tarea de la forma más rápida, clara y accesible posible.

---

## REGLAS NEGATIVAS (LO QUE NUNCA DEBE HACER)

### 1. No convertir todo en Cards

* ❌ **Nunca encapsules cada elemento en una card.**
* Usa cards únicamente cuando exista una agrupación lógica real e independiente.
* **Prefiere:** listas, tablas, divisores sutiles y secciones limpias antes que múltiples cards flotantes (*card fatigue*).

### 2. No abusar de los colores pastel

* Evita fondos de colores para cada sección.
* No uses azul pastel, verde pastel, rosa pastel o amarillo pastel como simple decoración.
* Los colores deben comunicar **estados** (éxito, advertencia, error, neutral), nunca decorar por capricho.

### 3. No usar emojis

* ❌ Nunca utilizar emojis decorativos en interfaces de trabajo, títulos, badges o botones.
* Usar únicamente una librería de iconos técnica y consistente (ej. **Lucide Icons**, Heroicons, Phosphor).

### 4. No usar gradientes innecesarios

* Los gradientes solo pueden aparecer cuando existe una estricta razón de identidad/branding.
* **Prohibido aplicar gradientes a:** botones, cards, tablas, formularios, banners o dashboards.

### 5. No usar Glassmorphism

* ❌ No usar: `backdrop-blur`, fondos translúcidos, efecto cristal o reflejos de vidrio, salvo que el producto sea explícitamente conceptual o futurista. En un ERP perjudican el rendimiento y la legibilidad.

### 6. No usar sombras exageradas

* Evitar sombras gigantes o difusas: `shadow-xl`, `shadow-2xl`, `shadow-3xl` o sombras coloreadas.
* **Preferir:** bordes sutiles del sistema (`border-border`), contraste natural y elevaciones mínimas (`shadow-xs` / `shadow-sm`).

### 7. No redondear todo

* No utilizar `border-radius: 20px;` (`rounded-2xl` o `rounded-3xl`) para todos los componentes.
* Usar una escala consistente (ej. `4px`, `6px`, `8px`, `12px` máximo en modales). Nunca mezclar radios aleatoriamente.

### 8. No centrar toda la interfaz

* El contenido de trabajo debe alinearse principalmente a la **izquierda** (Lógica F-pattern de escaneo).
* Solo centrar: héroes de bienvenida inicial, estados vacíos (*empty states*) o pantallas de confirmación aisladas. No centrar dashboards ni tablas de datos.

### 9. No crear héroes gigantes

* El contenido importante debe aparecer inmediatamente visible en el primer viewport (*above the fold*).
* No desperdiciar el espacio vertical con encabezados gigantescos o banners de bienvenida innecesarios.

### 10. No crear KPIs falsos

* Nunca inventar métricas genéricas y vacías de contexto (ej. "Revenue", "Visitors", "Growth", "Analytics") para rellenar huecos visuales.
* Las métricas deben provenir estrictamente del dominio del producto y responder a una necesidad de toma de decisiones del operador.

### 11. No usar demasiado espacio

* Evitar paddings, márgenes y gaps exagerados (`p-10`, `m-10`, `gap-10` / 40px) sin justificación.
* La información en herramientas B2B debe ser **densa pero respirable**, permitiendo ver el panorama completo sin scroll excesivo.

### 12. No repetir el mismo layout monótono

* No encadenar una fila repetitiva de: `Card` -> `Card` -> `Card` -> `Card`.
* Alternar según la naturaleza del dato: listas densas, tablas ordenables, gráficos específicos, timelines, paneles laterales divididos y acordeones.

### 13. No hacer interfaces de Dribbble / Behance

* **Priorizar:** eficiencia operativa, velocidad de carga, legibilidad y facilidad de escaneo.
* **No priorizar:** "verse bonito", efectos cosméticos o composiciones puramente de catálogo estático.

### 14. No poner iconos dentro de círculos por defecto

* Solo utilizar fondos circulares cuando exista una razón funcional explícita de agrupación o avatar.
* No convertir todos los iconos en "stickers" o sellos decorativos.

### 15. No usar botones enormes

* Los botones deben tener jerarquía visual estricta.
* No todos los botones son Call-to-Action primarios. Usar tamaños compactos o estándar (`size="sm"` / `size="default"`) y reservar el botón primario para la acción determinante de la vista.

### 16. No abusar de colores

* Definir una paleta sobria y semántica.
* No asignar un color arbitrario a cada sección, columna o tarjeta. La neutralidad favorece el enfoque del usuario.

### 17. No usar tipografía gigante

* El contenido y los datos son los protagonistas, no los títulos de sección. Mantener jerarquía tipográfica proporcional al trabajo de datos.

### 18. No usar animaciones para todo

* Toda animación debe responder a una acción o transición física que brinde contexto espacial. Nunca animar elementos de fondo ni decorar por decorar.

### 19. No crear dashboards vacíos

* Todo componente debe responder a una pregunta concreta del usuario.
* Si un gráfico, widget o columna no aporta información crítica accionable, debe eliminarse.

### 20. No usar componentes sin propósito

* Antes de agregar cualquier componente, preguntarse: **¿Por qué existe?**
* Si no hay una justificación clara de negocio o de usabilidad, **eliminarlo**.

---

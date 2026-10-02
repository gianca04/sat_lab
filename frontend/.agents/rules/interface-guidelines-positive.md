## REGLAS POSITIVAS (LO QUE SIEMPRE DEBE HACER)

### 1. Diseñar para productividad

* El usuario debe poder completar sus tareas más rápido y con menos esfuerzo mental. El software es una herramienta de precisión.

### 2. Maximizar densidad útil

* Mostrar la mayor cantidad de información relevante posible sin generar ruido visual ni saturación innecesaria.

### 3. Diseñar primero para desktop (en SaaS / ERP / Dashboards)

* Si es una herramienta de gestión y administración, optimizar primero para pantallas de escritorio con ratón y teclado. No diseñar como si fuera una aplicación móvil gigante escalada.

### 4. Priorizar la jerarquía visual

* Cada pantalla debe responder de inmediato a tres preguntas clave del usuario:
  1. **¿Qué es esto?** (Contexto claro).
  2. **¿Qué debo hacer?** (Acción principal evidente).
  3. **¿Qué es importante?** (Datos destacados y estado actual).

### 5. Diseñar pensando en escaneo rápido

* El usuario no lee la interfaz palabra por palabra: la escanea.
* Guiar la vista mediante alineaciones limpias, pesos tipográficos diferenciados (`font-medium`, `font-semibold`), espaciados proporcionales y agrupaciones semánticas.

### 6. Reducir el número de clics

* Siempre preguntarse: **¿Puede hacerse en un clic menos?**
* Exponer atajos directos, acciones rápidas en línea y evitar modales innecesarios sobre otros modales.

### 7. Mostrar solo información relevante

* Eliminar todo elemento decorativo. Menos es más cuando se trabaja con cientos de registros y operaciones críticas.

### 8. Mantener consistencia absoluta

* Todos los módulos del sistema deben compartir:
  * Espaciado
  * Tipografía
  * Radios de borde
  * Iconografía (familia y tamaño estándar)
  * Paleta de colores semántica
  * Comportamiento en los estados interactivos

### 9. Diseñar todos los estados de la interfaz

Toda pantalla, vista, formulario o componente necesita contemplar y resolver explícitamente:

* **Empty State:** Instructivo, explicando por qué no hay datos y ofreciendo la acción principal para crearlos.
* **Loading State:** Skeletons que imiten la estructura real del contenido para prevenir saltos de maquetación (*layout shift*).
* **Error State:** Claro, contextual y con opción de recuperación o reintento.
* **Success State:** Sutil y no intrusivo (toasts discretos, sin bloquear el flujo).
* **Disabled / ReadOnly:** Claramente comunicado, preservando la legibilidad.
* **Hover, Focus y Selected:** Feedback inmediato y nítido para la interacción por teclado y ratón.

### 10. Priorizar accesibilidad (WCAG 2.1 AA)

* Garantizar contraste de color adecuado para textos e iconos.
* Navegación íntegra por teclado (`Tab`, `Shift+Tab`, `Enter`, `Escape`).
* Anillos de foco visibles (`focus-visible:ring-2`).
* Áreas táctiles cómodas y etiquetas semánticas obligatorias en todos los campos (`<Label>`).

### 11. Diseñar con sistemas de tokens (escalas fijas)

Usar escalas estandarizadas, nunca valores numéricos arbitrarios:

* **Espaciado:** `4px`, `8px`, `12px`, `16px`, `24px`, `32px` (escala estándar de Tailwind: `gap-1`, `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`).
* **Radios de borde:** `4px` (`rounded-sm`), `6px` (`rounded-md`), `8px` (`rounded-lg`).
* **Tipografía:** `12px` (`text-xs`), `14px` (`text-sm`), `16px` (`text-base`), `20px` (`text-xl`), `24px` (`text-2xl`), `32px` (`text-3xl`).

### 12. Utilizar patrones reales de clase mundial

Inspirarse en productos reconocidos por su ergonomía, sobriedad y velocidad:

* **Linear, GitHub, Notion, Stripe Dashboard, Vercel, Figma, Raycast, Apple, Arc Browser.**

### 13. Optimizar para usuarios frecuentes

* Asumir que el operador abrirá y usará esta aplicación cientos de veces al día.
* Reducir fricciones repetitivas, memorizar preferencias cuando aplique y priorizar atajos de teclado y flujos ágiles.

### 14. Favorecer la simplicidad visual

* Cuando existan dos soluciones válidas para resolver un problema, elegir siempre la que utilice:
  * Menos componentes
  * Menos colores
  * Menos líneas divisorias
  * Menos ruido visual

### 15. Validar cada elemento

Antes de renderizar cualquier elemento en pantalla, someterlo a esta prueba:

1. ¿Aporta valor real al usuario?
2. ¿Es estrictamente necesario?
3. ¿Reduce el tiempo para completar la tarea?
4. ¿Puede reemplazarse por algo más simple o eliminarse por completo?

### 16. Acciones Destructivas y Eliminación

* Todo botón o acción de eliminar debe contar siempre con una confirmación explícita (diálogo o botón de confirmación en dos pasos) antes de ejecutarse para prevenir la pérdida accidental de datos. Nunca eliminar registros directamente con un solo clic.

---

## INTEGRACIÓN CON BASE UI / SHADCN Y FORMULARIOS (Herencia de `modal-guidelines.md`)

1. **Uso estricto de componentes estándar:**
   * Utilizar siempre las primitivas del sistema (`<Input>`, `<Button>`, `<Select>`, `<Table>`, `<Checkbox>`, `<Badge>`, `<Dialog>`, `<Sheet>`).
   * **Cero clases CSS arbitrarias:** No inventar clases personalizadas de fondo, bordes o tamaños (`bg-muted/30`, `border-border/50`, etc.). Utilizar los tokens oficiales.
2. **Reutilización entre Modos (Crear / Editar / Vista):**
   * Compartir el mismo formulario base pasando `readOnly={true}`.
   * **No sustituir inputs por divs o badges improvisados en modo solo lectura:** Mantener los componentes base con su propiedad `readOnly` o `disabled`, conservando una estructura visual idéntica y predecible.
3. **Manejo inteligente de foco (`autoFocus`):**
   * En creación/edición: `autoFocus` en el primer campo accionable.
   * En modo vista: `autoFocus={false}` para permitir una apertura limpia.
4. **Copia de datos libre:**
   * En todas las vistas (tablas, formularios, modales), garantizar que códigos, SKUs, referencias, montos y textos puedan seleccionarse y copiarse libremente con el cursor sin bloqueos de drag o contenedores que impidan la selección.

---

## ESTRUCTURA DE WIDGETS Y VISTAS DE DETALLE (Patrón Almacenes / `warehouses/show.tsx`)

### 1. Cabecera de Página (`PageHeader`)

* **Título Principal:** Nombre de la entidad (ej. `warehouse.name`).
* **Badges de Estado e Identificador:** Muestra el ID (`#1`) en variante `secondary` y el estado (`Activo` / `Inactivo`) con icono (`CheckCircle2` / `XCircle`) en variante `default` / `secondary`.
* **Sub-información de ubicación:** Dirección o metadatos de ubicación con icono `MapPin` en la esquina superior derecha (`actions`).

### 2. Navegación por Tabs Estandarizada

* **Alineación y Tamaño Compacto Estricto:** Toda estructura mediante `<Tabs>` debe utilizar un contenedor disparador compacto con `<TabsList className="h-9 w-fit">` (o `w-auto`), alineado a la izquierda.
* **Prohibición de Estiramiento:** Queda estrictamente prohibido usar clases que estiren las pestañas al 100% del ancho de la pantalla (como `w-full` o `grid-cols-*` sin acotar), asegurando que los tabs mantengan un tamaño sobrio, compacto y uniforme en todos los módulos del sistema.

### 3. Grid de Widgets de Métricas Operativas (KPIs)

* **Uso Obligatorio de Componentes Canónicos:** Se DEBEN utilizar los componentes importados de `@/components/metric-card`: `<MetricGrid>` y `<MetricCard>`. Prohibido maquetar tarjetas de métricas manualmente con divs inline.
* **Contenedor `<MetricGrid>`:** Renderiza automáticamente `grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6` para adaptarse desde móvil a pantallas de alta resolución.
* **Tarjeta de Métrica (`<MetricCard>`):**
  * Acepa las props: `title`, `value`, `icon` (LucideIcon), `unit` (opcional) y `subtitle` (opcional).
  * Estructura base: `rounded-lg border border-border bg-card p-3 shadow-xs`.
  * Cabecera interna: Etiqueta en `text-xs font-medium text-muted-foreground` alineada junto con su icono técnico Lucide de 14px (`size-3.5`).
  * Valor principal: `text-xl font-bold tracking-tight text-foreground`.
  * Subtexto/Unidad descriptiva: `text-xs text-muted-foreground mt-0.5`.
* **Métricas clave estándar del módulo:** Pasillos (`Route`), Racks (`Layers`), Ubicaciones (`Grid3X3`), Líneas de Stock (`Boxes`), Movimientos (`ArrowLeftRight`), Superficie/Área (`Maximize2`).

### 4. Tarjetas de Especificaciones y Auditoría (`Card` size="sm")

* Organizadas en `grid grid-cols-1 md:grid-cols-2 gap-6`.
* **Ficha Técnica / Geometría:** Lista de descripción (`<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">`) con dimensiones (Ancho Eje X, Largo Eje Z, Área m², Perímetro estimado).
* **Información Administrativa / Auditoría:** ID de registro, Estado Operativo, Fecha de Creación y Última Actualización (`formattedDate`), Dirección.
* Términos en `<dt className="text-muted-foreground">` y valores en `<dd className="font-medium text-foreground mt-0.5">`.

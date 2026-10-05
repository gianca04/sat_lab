# UI Style Guide --- Grafana-like Sobriety

## Objetivo

La interfaz debe tomar como referencia visual a **Grafana**: técnica,
oscura, compacta, sobria y orientada a operación.

**No copiar Grafana literalmente.** Adoptar sus principios de diseño y
aplicarlos de forma consistente al sistema.

> **Principio rector:** contenido y funcionalidad primero; decoración
> mínima.

------------------------------------------------------------------------

## 1. Reglas obligatorias

1. **No usar modales.**
2. Preferir páginas, secciones, paneles inline y navegación contextual.
3. Mantener una interfaz oscura y profesional.
4. Usar colores con significado, no como decoración.
5. Mantener alta densidad de información sin sacrificar legibilidad.
6. Usar bordes y separadores sutiles para estructurar.
7. Evitar sombras, gradientes y efectos visuales innecesarios.
8. Los controles deben ser compactos.
9. Los iconos deben tener una función concreta.
10. No convertir cada bloque en una card.

------------------------------------------------------------------------

# 2. Lenguaje visual observado en Grafana

Las referencias muestran principalmente:

- Fondo general casi negro.
- Superficies ligeramente más claras para paneles y controles.
- Bordes de aproximadamente 1 px.
- Contraste basado principalmente en tonos de gris.
- Tipografía clara y de tamaño contenido.
- Botones pequeños y compactos.
- Inputs oscuros con borde discreto.
- Navegación horizontal superior.
- Navegación lateral compacta.
- Estados activos mediante una combinación de contraste + color de
    acento.
- Azul para acciones primarias.
- Naranja como acento/indicador de selección en ciertos elementos.
- Verde para estados positivos.
- Rojo para errores o acciones destructivas.
- Muy poco uso de sombras.

La sensación general es la de una **herramienta técnica**, no la de una
aplicación de marketing.

------------------------------------------------------------------------

# 3. Estructura de página

Preferir:

``` text
┌─────────────────────────────────────────────────────┐
│ Navegación / contexto                               │
├──────────────┬──────────────────────────────────────┤
│              │ Título                               │
│ Navegación   │ Descripción/contexto                 │
│ lateral      │                                      │
│              │ ───────────────────────────────────  │
│              │ Sección                              │
│              │                                      │
│              │ Campos / tabla / contenido           │
│              │                                      │
│              │ ───────────────────────────────────  │
│              │ Acciones                             │
└──────────────┴──────────────────────────────────────┘
```

La estructura debe sentirse continua.

**No diseñar cada sección como una tarjeta flotante independiente.**

------------------------------------------------------------------------

# 4. Navegación

## Barra superior

Debe ser compacta.

Características:

- Altura contenida.
- Fondo oscuro.
- Borde inferior sutil.
- Iconos pequeños.
- Texto de navegación discreto.
- Breadcrumbs cuando aporten contexto.

Ejemplo:

``` text
☰   Aplicación   >   Configuración   >   Análisis
```

No utilizar una barra superior gigante.

------------------------------------------------------------------------

## Navegación lateral

Debe ser funcional y compacta.

El elemento activo puede utilizar:

- fondo ligeramente diferente;
- borde/acento lateral;
- texto más claro;
- icono visible.

No usar tarjetas grandes para cada opción del menú.

------------------------------------------------------------------------

# 5. Fondo y superficies

Utilizar varias tonalidades oscuras cercanas entre sí.

Conceptualmente:

``` text
Background
    ↓
Surface
    ↓
Control
    ↓
Hover / Active
```

Las diferencias deben ser pequeñas.

Ejemplo conceptual:

``` text
#0F1115  → fondo
#17191F  → superficie
#1F2229  → control / panel
#252932  → hover
```

Los valores anteriores son referencias visuales, no colores
obligatorios.

### Evitar

``` text
background: negro puro
+
cards blancas
```

o contrastes extremos entre superficies.

------------------------------------------------------------------------

# 6. Bordes

Los bordes son importantes para separar contenido.

Preferir:

``` css
border: 1px solid;
```

con bajo contraste.

Usarlos en:

- inputs;
- tablas;
- paneles;
- separadores;
- controles;
- navegación.

No utilizar bordes gruesos ni brillantes.

------------------------------------------------------------------------

# 7. Border radius

La UI debe sentirse técnica y compacta.

Preferir radios pequeños:

``` text
2px
4px
6px
```

Evitar:

``` text
rounded-2xl
rounded-3xl
rounded-full
```

salvo controles que realmente requieran forma circular.

No usar esquinas excesivamente redondeadas.

------------------------------------------------------------------------

# 8. Tipografía

La tipografía debe ser:

- pequeña/moderada;
- clara;
- funcional;
- consistente.

Jerarquía:

``` text
Título de página
    ↓
Título de sección
    ↓
Label
    ↓
Contenido
    ↓
Ayuda
```

No utilizar títulos gigantes.

Evitar:

``` text
text-5xl
text-6xl
```

para pantallas administrativas normales.

Los labels deben ser visibles pero no dominar la pantalla.

------------------------------------------------------------------------

# 9. Espaciado

Grafana utiliza una densidad relativamente alta.

No crear espacios enormes entre elementos.

Preferir una escala consistente:

``` text
4
8
12
16
24
32
```

Regla:

> Más espacio entre secciones; menos espacio entre elementos
> pertenecientes a la misma sección.

Ejemplo:

``` text
Sección
   ↓ 24px

Label
   ↓ 6-8px
Input
   ↓ 4-8px
Ayuda

   ↓ 24px

Siguiente campo
```

------------------------------------------------------------------------

# 10. Formularios

Los formularios deben parecer pantallas de configuración técnica.

Patrón:

``` text
Connection

Host URL *
[ 192.168.10.73 ]

Database name *
[ sat_lab ]


Authentication

Username *
[ sat_admin ]

Password
[ ******** ]
```

### Reglas

- Labels pequeños y claros.
- Inputs compactos.
- Ayuda debajo del campo cuando sea necesaria.
- Agrupar campos relacionados.
- Separar visualmente las secciones.
- No envolver cada campo en una card.

------------------------------------------------------------------------

# 11. Inputs

Los inputs deben tener:

- fondo oscuro;
- borde discreto;
- altura compacta;
- texto claro;
- placeholder de menor contraste;
- estado focus claramente identificable.

Estados:

``` text
Default
Hover
Focus
Disabled
Error
```

El `focus` debe destacar mediante borde/acento, pero sin glow excesivo.

------------------------------------------------------------------------

# 12. Selects, toggles y controles

Los controles deben mantener el mismo lenguaje visual:

- compactos;
- oscuros;
- bordes sutiles;
- estados claros;
- iconografía discreta.

Un toggle no debe convertirse en un elemento visual protagonista.

------------------------------------------------------------------------

# 13. Botones

Los botones deben ser pequeños y directos.

### Primario

Usar un color de acción claramente identificable.

Ejemplo:

``` text
[ Guardar ]
```

### Secundario

``` text
[ Cancelar ]
[ Probar conexión ]
```

### Destructivo

Utilizar rojo únicamente cuando la acción sea realmente destructiva.

### Regla

No utilizar todos los botones como botones primarios.

Evitar:

``` text
[ ✨ Crear nuevo análisis increíble ]
```

Preferir:

``` text
[ Crear análisis ]
```

------------------------------------------------------------------------

# 14. Iconos

Los iconos deben ser:

- lineales;
- pequeños;
- consistentes;
- funcionales.

Usarlos para:

- buscar;
- editar;
- eliminar;
- configurar;
- navegar;
- expandir;
- filtrar;
- ejecutar;
- indicar estados.

### No usar

- emojis;
- iconos gigantes;
- ilustraciones decorativas;
- múltiples estilos de iconos.

------------------------------------------------------------------------

# 15. Tablas

Para información tabular, preferir tablas reales.

Ejemplo:

``` text
Código      Nombre                 Estado       Acciones
----------------------------------------------------------
ANA-001     Glucosa                Activo       ...
ANA-002     Hemoglobina            Activo       ...
ANA-003     Colesterol             Inactivo     ...
```

Características:

- encabezado discreto;
- filas compactas;
- separadores finos;
- hover leve;
- acciones pequeñas;
- estados mediante indicadores/badges discretos.

No convertir cada fila en una card.

------------------------------------------------------------------------

# 16. Badges y estados

Los estados deben usar color de forma semántica.

``` text
Activo      → verde
Advertencia → amarillo
Error       → rojo
Información → azul
Normal      → neutro
```

Los badges deben ser pequeños.

Evitar:

``` text
████████████████
     ACTIVO
████████████████
```

Preferir indicadores compactos:

``` text
Activo
```

o un badge pequeño.

------------------------------------------------------------------------

# 17. Alertas y mensajes

No utilizar modales para mensajes normales.

Preferir:

``` text
✓ Cambios guardados correctamente.
```

o:

``` text
Error: no se pudo establecer la conexión.
```

El mensaje debe aparecer dentro del flujo de la página.

Para errores de un campo:

``` text
Host URL
[ 192.168.10.999 ]

Dirección IP no válida.
```

Para estados generales:

``` text
┌─────────────────────────────────────────────┐
│ Error: no se pudo conectar con PostgreSQL. │
└─────────────────────────────────────────────┘
```

Siempre que sea posible, el usuario debe poder continuar sin cerrar una
ventana.

------------------------------------------------------------------------

# 18. NO MODALES

## Regla absoluta

**No utilizar modales para crear, editar, consultar o configurar
información.**

### Incorrecto

``` text
Listado
   ↓
Click "Editar"
   ↓
MODAL
   ↓
Formulario
```

### Correcto

``` text
Listado
   ↓
Click "Editar"
   ↓
Página de edición
```

o:

``` text
Listado
   ↓
Panel/sección contextual
   ↓
Editar
```

Los formularios importantes deben tener espacio suficiente y una
URL/ruta propia cuando corresponda.

------------------------------------------------------------------------

# 19. Confirmaciones sin modal

Evitar:

``` text
¿Está seguro de eliminar?
[Cancelar] [Eliminar]
```

en un modal.

Preferir una confirmación contextual:

``` text
Eliminar análisis ANA-001

Esta acción eliminará el registro seleccionado.

[Cancelar]    [Eliminar]
```

dentro de la página o sección correspondiente.

Para acciones destructivas frecuentes, utilizar acciones inline con
estado de confirmación sin bloquear toda la interfaz.

------------------------------------------------------------------------

# 20. Cards

Las cards **no son el componente visual principal**.

Usarlas solamente cuando exista una agrupación semántica clara.

### Buena utilización

``` text
Panel de conexión
```

cuando realmente contiene un bloque independiente.

### Mala utilización

``` text
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Campo 1  │ │ Campo 2  │ │ Campo 3  │
└──────────┘ └──────────┘ └──────────┘
```

Cada campo no necesita su propia card.

Preferir una composición continua.

------------------------------------------------------------------------

# 21. Color

El color debe comunicar estado o acción.

Paleta conceptual:

``` text
Neutro   → estructura / contenido
Azul     → acción primaria
Naranja  → selección / acento
Verde    → éxito / activo
Amarillo → advertencia
Rojo     → error / destructivo
```

No utilizar todos simultáneamente.

## Regla

> Si todo tiene color, nada tiene prioridad.

------------------------------------------------------------------------

# 22. Sombras y efectos

Usar sombras mínimas o ninguna.

Evitar:

``` text
shadow-2xl
drop-shadow
glow
blur
glassmorphism
```

La profundidad debe lograrse principalmente mediante:

- contraste de superficies;
- bordes;
- espaciado;
- jerarquía.

------------------------------------------------------------------------

# 23. Animaciones

Las animaciones deben ser discretas.

Permitido:

- transición de hover;
- expansión/contracción;
- feedback de guardado;
- carga.

Evitar:

- rebotes;
- zoom;
- escalado excesivo;
- animaciones decorativas;
- efectos permanentes.

La UI debe sentirse rápida.

------------------------------------------------------------------------

# 24. Estados vacíos

Un estado vacío debe ser simple.

Ejemplo:

``` text
No hay datos
```

Opcionalmente:

``` text
No hay análisis registrados.

[ Crear análisis ]
```

No agregar ilustraciones gigantes.

------------------------------------------------------------------------

# 25. Responsive

Mantener la misma filosofía visual en desktop y móvil.

No convertir automáticamente todo en:

``` text
Card
Card
Card
Card
```

en pantallas pequeñas.

Priorizar:

1. jerarquía;
2. legibilidad;
3. acciones;
4. navegación;
5. densidad adecuada.

------------------------------------------------------------------------

# 26. Arquitectura visual recomendada

``` text
┌──────────────────────────────────────────────────────┐
│ Header / Breadcrumb                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Título                                               │
│ Descripción breve                                    │
│                                                      │
│ ───────────────────────────────────────────────────  │
│                                                      │
│ Sección                                              │
│                                                      │
│ Label                                                │
│ [ Input                                      ]       │
│ Ayuda                                                │
│                                                      │
│ Label                                                │
│ [ Input                                      ]       │
│                                                      │
│ ───────────────────────────────────────────────────  │
│                                                      │
│ Otra sección                                         │
│                                                      │
│ Tabla / formulario / contenido                       │
│                                                      │
│ ───────────────────────────────────────────────────  │
│                                                      │
│ [ Acción secundaria ]             [ Guardar ]         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

La pantalla debe sentirse como **una única herramienta coherente**, no
como una colección de componentes aislados.

------------------------------------------------------------------------

# 27. Checklist para el agente

Antes de implementar una interfaz, verificar:

### Estructura

- [ ] ¿La pantalla tiene una jerarquía clara?
- [ ] ¿Las secciones están separadas sin exceso de cards?
- [ ] ¿El contenido ocupa el espacio de forma eficiente?

### Estilo

- [ ] ¿El fondo es oscuro y sobrio?
- [ ] ¿Los bordes son sutiles?
- [ ] ¿Los radios son pequeños?
- [ ] ¿La tipografía es contenida?
- [ ] ¿La densidad es similar a una herramienta técnica?

### Componentes

- [ ] ¿Los inputs son compactos?
- [ ] ¿Los botones tienen jerarquía?
- [ ] ¿Los iconos son funcionales?
- [ ] ¿Los estados utilizan color semántico?
- [ ] ¿Las tablas se mantienen como tablas?

### Restricciones

- [ ] **¿Hay algún modal? Si existe, eliminarlo.**
- [ ] ¿Hay alguna card que no aporte agrupación real?
- [ ] ¿Hay colores decorativos?
- [ ] ¿Hay sombras o efectos innecesarios?
- [ ] ¿Hay emojis o ilustraciones innecesarias?
- [ ] ¿Hay espacios excesivamente grandes?

------------------------------------------------------------------------

# 28. Regla final

Cuando exista duda entre dos alternativas:

``` text
Más simple
     ↓
Más compacto
     ↓
Más funcional
     ↓
Más consistente
```

Preferir esa opción.

> **La interfaz debe parecer una herramienta técnica que un usuario
> puede utilizar durante horas: silenciosa, clara, densa y predecible.**

**Referencia visual:** Grafana.\
**Objetivo:** tomar su sobriedad y lenguaje técnico, sin convertir la
aplicación en una copia de Grafana.

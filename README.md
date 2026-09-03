# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Skins / temas visuales](#skins--temas-visuales)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados, más una
  **pieza extra tipo tuerca** (3×3 con un hueco central que sus propias celdas dejan
  encerrado): el hueco no se puede rellenar y bloquea esa fila, es el reto añadido.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.
- **Toggle de tema claro/oscuro** (modo oscuro por defecto), con la preferencia guardada en `localStorage`.
- **Pantalla de inicio** con top 5 de records, mejor combo y líneas máximas; la partida no
  arranca sola, hay que pulsar **JUGAR**.
- **Tabla de records local** (top 5) guardada en `localStorage`, con seguimiento de **combo**
  (rachas de _locks_ que limpian línea) y persistencia de **mejor combo** y **líneas máximas**
  entre partidas.
- **Skins visuales** (`retro`, `neon`, `pastel`, `pixel`) seleccionables desde el panel lateral, con la preferencia guardada en `localStorage`.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `P`       | Pausar / reanudar                 |

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza, un selector `#skin-select` de skin visual y la lista de controles.
- Un botón `#theme-toggle` junto al título para alternar entre modo oscuro y claro.
- Un `#overlay` que contiene la caja de **PAUSA**, la pantalla de inicio `#start-screen`
  (top 5 + JUGAR) y la pantalla de game over `#gameover-screen` (records + guardar nombre).

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_ por defecto: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays. Los colores están definidos como variables CSS en `:root`, y la clase `body.light-theme` las sobrescribe con una paleta clara cuando el tema está activo.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–8) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Tema claro/oscuro** (`applyTheme`, `initTheme`): alterna la clase `light-theme` en `<body>`, actualiza los colores de rejilla y highlight usados dentro del canvas (que no heredan del CSS) y persiste la preferencia en `localStorage` bajo la clave `tetris-theme`. Por defecto, si no hay preferencia guardada, el juego arranca en modo oscuro.
- **Records locales** (`loadScores`, `saveScores`, `qualifies`, `addScore`, `resetScores`): siguen el mismo patrón que el tema. Todo se guarda bajo la clave `tetris-scores` con la forma `{ scores: [{ name, score }], bestCombo, maxLines }`. `loadScores` valida el JSON de forma defensiva (que sea objeto, `scores` un array, `name` string, `score` numérico finito) y recorta a top 5 ordenado descendente; cualquier fallo de parseo o de `localStorage` cae en `try/catch` y deja los valores a cero. `qualifies(score)` decide si una puntuación entra en el top 5.
- **Combo** (`combo`, `bestComboRun`): dentro de `clearLines`, si se limpia ≥1 línea `combo++` y se actualiza `bestComboRun`; si un _lock_ no limpia nada, `combo = 0`. Al terminar la partida, `endGame` consolida `bestCombo = max(bestCombo, bestComboRun)` y `maxLines = max(maxLines, lines)` y persiste ambos globales.
- **Pantallas** (`#start-screen`, `#gameover-screen`, dentro de `#overlay`): `init(startLevel = 1)` resetea el estado y muestra `#start-screen` (top 5 + mejor combo + líneas máximas + botón **JUGAR**) pero **no** arranca la partida; `startGame()` hace el primer `spawn` y lanza el bucle RAF. `endGame` puebla y muestra `#gameover-screen` con la puntuación final, un `<input>` de nombre si `qualifies(score)`, la tabla top 5 (resaltando la fila recién añadida con `.records-highlight`), un botón **Reiniciar** y un botón **Resetear records** con confirmación _inline_ de dos clics (nunca `confirm()`). Tanto el botón "Reiniciar" del game over como el `#restart-btn` heredado vuelven a `init()`, es decir, a la pantalla de inicio.
- **Skins visuales** (`applySkin`, `initSkin`): ver la sección [Skins / temas visuales](#skins--temas-visuales).

### Flujo del juego

```
init(startLevel = 1)
  ├─ createBoard()                  → matriz vacía
  ├─ reset de estado + combo
  └─ showStartScreen()              → top 5, mejor combo, líneas máximas, botón JUGAR
        ↓  (click en JUGAR)
startGame()
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()`, que consolida los records globales (`bestCombo`, `maxLines`), los persiste y muestra `#gameover-screen`.

---

## Records y persistencia

Los records viven en `localStorage` bajo la clave **`tetris-scores`** con esta forma:

```json
{
  "scores": [ { "name": "ANA", "score": 12800 }, ... ],
  "bestCombo": 5,
  "maxLines": 42
}
```

- **`scores`**: top 5 ordenado de mayor a menor. Se valida al cargar (array, `name` string,
  `score` numérico finito) y se recorta a 5.
- **`bestCombo`**: combo más alto logrado en cualquier partida. Un "combo" es una racha de
  bloqueos consecutivos que limpian al menos una línea; se rompe (vuelve a 0) en cuanto un
  bloqueo no limpia nada.
- **`maxLines`**: mayor número de líneas eliminadas en una sola partida.

Todo acceso a `localStorage` está envuelto en `try/catch`, así que si el almacenamiento no
está disponible el juego sigue funcionando sin persistencia.

En el **game over**, si la puntuación entra en el top 5 aparece un campo de texto para el
nombre; la fila recién añadida se resalta en la tabla. El botón **Resetear records** borra
`scores`, `bestCombo` y `maxLines`, y pide confirmación con un segundo clic (nunca abre un
`confirm()` del navegador).

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── game.js         # Toda la lógica del Tetris (~300 líneas)
└── README.md
```

---

## Skins / temas visuales

Además del toggle claro/oscuro, el juego incluye un selector `#skin-select` en el
panel lateral con cuatro skins. La elección se guarda en `localStorage` bajo la
clave `tetris-skin` (acceso envuelto en `try/catch`) y se restaura al recargar.

Toda la lógica vive en la constante `SKINS` de `game.js` y en el par
`applySkin(name)` / `initSkin()` (calcado de `applyTheme` / `initTheme`). Cada
entrada de `SKINS` aporta: una paleta de 8 colores (equivalente a `COLORS[1..8]`),
el color de rejilla y el de highlight por tema, y un `mode` de dibujo de bloque
que `drawBlock` interpreta. `drawBlock` y `drawGrid` leen siempre de la skin
activa, así que el `#next-canvas` hereda la skin automáticamente y el parámetro
`alpha` (ghost) sigue funcionando en las cuatro.

| Skin     | Modo de bloque                                                                 |
| -------- | ----------------------------------------------------------------------------- |
| `retro`  | Comportamiento por defecto **exacto**: colores planos + highlight superior de 4px. |
| `neon`   | `ctx.shadowBlur` / `shadowColor` para un halo de luz. El `shadowBlur` se resetea a `0` tras cada bloque para no contaminar rejilla ni ghost. |
| `pastel` | Colores suaves + esquinas redondeadas con `ctx.roundRect` (fallback a `fillRect` si el navegador no lo soporta). |
| `pixel`  | Bloque plano + patrón de puntos oscuros dibujado encima como textura.        |

### Relación con el tema claro/oscuro

Las skins conviven con el toggle claro/oscuro (`theme` global, `body.light-theme`):

- `retro`, `pastel` y `pixel` **respetan el tema**: su color de rejilla y de
  highlight cambian según haya modo claro u oscuro activo.
- `neon` **fuerza su estética oscura**: aplica `body.skin-neon` en el `<body>`,
  lo que pinta el fondo de ambos canvas de negro vía CSS, y usa rejilla y
  highlight fijos (idénticos en `dark` y `light`) para mantener el contraste del
  glow independientemente del toggle.

Al cambiar de skin se guarda la preferencia, se actualiza la variable de skin
activa y se repinta de inmediato (`draw()` + `drawNext()`) sin recargar la página.

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 8 colores             |
| `SKINS`        | Skins visuales (paleta, rejilla, modo de bloque) | `retro` / `neon` / `pastel` / `pixel` |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.

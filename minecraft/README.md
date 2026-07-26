# Minecraft: ¿plugin o mod? — Recomendación (julio 2026)

Resumen de la decisión, el estado actual de versiones y qué se ha dejado montado
en este repositorio.

---

## 1. Respuesta corta

**Haz un plugin de servidor con la API de Paper.** Es la opción correcta salvo que
necesites añadir bloques, ítems, mobs o dimensiones *nuevos de verdad* — en ese
caso necesitas un mod (Fabric o NeoForge).

La razón de peso: **con un plugin, los jugadores entran con el Minecraft normal, sin
instalar nada.** Con un mod, cada jugador tiene que instalar el loader y el mod con la
versión exacta o no puede entrar. Eso mata a la mayoría de servidores pequeños antes
de empezar.

---

## 2. Comparativa

| | **Plugin** (Paper / Spigot) | **Mod** (Fabric / NeoForge) |
|---|---|---|
| Dónde se instala | Solo en el servidor | Servidor **y** cada cliente |
| El jugador instala algo | ❌ No, entra con el MC vanilla | ✅ Sí, loader + mod + versión exacta |
| Bloques / ítems / mobs nuevos | ❌ No reales (se simulan con modelos e ítems custom + resource pack) | ✅ Sí, de verdad |
| Cambiar reglas, economía, comandos, GUIs, eventos | ✅ Es exactamente para lo que sirve | ✅ También, pero con más trabajo |
| Modificar el render, HUD, shaders, cámara | ❌ Imposible (no toca el cliente) | ✅ Sí |
| Actualizar a la siguiente versión de MC | 🟢 Fácil, casi siempre solo recompilar | 🔴 Doloroso, los mixins rompen |
| Curva de aprendizaje | 🟢 Suave | 🟡 Bastante más dura |
| Compatibilidad entre sí | Un plugin funciona en Paper/Purpur/Spigot | Un mod de Fabric **no** funciona en NeoForge y viceversa |

> Ojo con una confusión habitual: **Fabric y NeoForge no ejecutan plugins de Bukkit/Paper**,
> y Paper no ejecuta mods. Son dos ecosistemas separados. Existen híbridos (Mohist, Arclight)
> pero son inestables y no los recomiendo.

### Cuándo sí merece la pena un mod

- Quieres un mineral nuevo, un bioma nuevo, una máquina tipo Create.
- Quieres tocar el cliente: HUD custom, minimapa, shaders.
- Es para ti y cuatro amigos con un modpack, no para un servidor público.

### Cuándo el plugin gana claramente

- Servidor survival / SMP / minijuegos / roleplay.
- Economía, trabajos, rangos, protección de terrenos, kits, duelos, eventos.
- Quieres que la gente entre poniendo la IP y ya está.

---

## 3. Estado de versiones (julio 2026)

Minecraft cambió al formato `año.drop.hotfix` en 2026, así que ya no verás "1.21.x".

| Cosa | Estado |
|---|---|
| Última Java Edition | **26.2 "Chaos Cubed"** (16 junio 2026) — cuevas de azufre, sulfur cubes, render Vulkan experimental |
| Siguiente | **26.3** — en snapshots desde el 23 de junio, salida prevista Q3 2026 |
| Java necesario | **Java 25** (obligatorio desde 26.1) |
| Paper estable | **26.1.2** (build 74) |
| Paper 26.2 | Publicado pero en canal **experimental** (build ~71) |
| Fabric | Soporta 26.2: Loader 0.19.3, Loom 1.17, Gradle 9.5.1 |
| NeoForge | Soporta 26.2 (rama 26.2.x) |
| Forge legacy | Prácticamente muerto en versiones modernas |

### Qué versión elegir

- **Servidor en producción / con gente jugando → apunta a 26.1.2.** Paper ahí es estable.
- **Proyecto nuevo, para aprender y estar al día → 26.2.** Es lo que se ha configurado aquí.
- **No apuntes a 26.3 todavía**: está en snapshots y la API cambia cada semana.

Un detalle bueno de 2026: **desde 26.1 Mojang publica el servidor sin ofuscar**, así que
ya no hace falta el paso de "reobfuscation" de `paperweight`. Desarrollar es más simple
que en la era 1.21.

---

## 4. Qué se ha creado en este repo

Hay dos proyectos, uno de cada tipo, para que compares:

| Carpeta | Tipo | Qué es |
|---|---|---|
| [`zarmining/`](./zarmining) | **Plugin** (Paper) | Minería con niveles y XP. El jugador no instala nada. |
| [`zarlippita/`](./zarlippita) | **Mod** (Fabric) | Mineral nuevo con gema, bloque y pico. Cada jugador lo instala. |

### El plugin: `zarmining/`

Un plugin de Paper listo para compilar: **ZarMining**, un sistema de minería con niveles.

Lo elegí porque es el equivalente en Minecraft de tu recurso
[`esx_mining/`](../esx_mining) de FiveM: reutiliza la misma idea y **la misma fórmula de
experiencia** (`100 + (nivel - 1) * 75`), con picos que piden nivel mínimo y dan
multiplicador de XP.

Qué hace:

- XP por bloque minado, configurable por material (incluye `SULFUR` y `CINNABAR` de 26.2).
- Niveles con subida automática y comandos de recompensa al llegar a cierto nivel.
- Picos con nivel requerido y multiplicador — si no tienes nivel, no puedes picar.
- Anti-farmeo: los bloques colocados por jugadores no dan XP (y se recuerda tras reiniciar).
- Vein miner desbloqueable por nivel: agáchate al picar y sale la veta entera.
- Drops extra con probabilidad configurable.
- `/mineria`, `/mineria top`, `/mineria reload`, `/mineria reset <jugador>`.
- Todos los textos en `config.yml` con formato MiniMessage (colores, negrita, etc.).

Instrucciones de compilación e instalación: [`zarmining/README.md`](./zarmining/README.md).

---

## 5. El mod: `zarlippita/`

Carpeta [`minecraft/zarlippita/`](./zarlippita) — un mod de **Fabric para 26.2**
que añade un mineral nuevo de verdad:

- **Mena de zarlippita** que genera sola en las cuevas (Y entre -60 y 20)
- **Zarlippita**, la gema que suelta, compatible con Fortuna y Toque de seda
- **Bloque de zarlippita** para almacenar (9 gemas ↔ 1 bloque)
- **Pico de zarlippita**, mejor que el de netherita

Con texturas propias, recetas, drops y traducción a español e inglés.

Instrucciones completas: [`zarlippita/README.md`](./zarlippita/README.md).

### Ojo con los tutoriales viejos

Minecraft 26.x rompió el modding respecto a 1.21. Si buscas guías por internet,
casi todas están desactualizadas. Los cambios importantes:

| Antes (1.21 y anteriores) | Ahora (26.1+) |
|---|---|
| Mappings de Yarn | **Yarn está muerto**, se usan los nombres oficiales de Mojang |
| `Identifier` | `ResourceLocation` |
| `Item.Settings` | `Item.Properties` |
| `mappings "net.fabricmc:yarn:..."` | **no se declara nada** |
| plugin `fabric-loom` | plugin `net.fabricmc.fabric-loom` |
| `modImplementation` | `implementation` |
| clase `PickaxeItem` | `Item` normal + `Properties.pickaxe(...)` |
| `ItemGroupEvents` | `CreativeModeTabEvents` (y cambió de paquete) |

El motivo de fondo: desde 26.1 Mojang publica el servidor **sin ofuscar**, y eso
hizo innecesaria media infraestructura del modding.

### Si prefieres NeoForge

La plantilla oficial está en <https://github.com/NeoForgeMDKs> (rama 26.2).
Mismo concepto, otra API. Dímelo y lo monto.

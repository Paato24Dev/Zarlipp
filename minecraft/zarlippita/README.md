# Zarlippita — mod de Fabric para Minecraft 26.2

Un mod **de verdad**: añade un mineral nuevo al juego, con su gema, su bloque y
su pico. No es un plugin — esto modifica el juego, así que se instala en el
Minecraft de cada jugador.

## Qué añade

| Cosa | Qué es |
|---|---|
| **Mena de zarlippita** | Mineral cian que aparece solo en las cuevas, entre Y=-60 y Y=20. Necesita pico de hierro o mejor. Suelta XP al picarlo. |
| **Zarlippita** | La gema que sueltas al picar la mena. Funciona con Fortuna y Toque de seda. |
| **Bloque de zarlippita** | 9 gemas → 1 bloque, para almacenar. Reversible. |
| **Pico de zarlippita** | Mejor que el de netherita: 2200 usos, velocidad 10, encantabilidad 22. |

Todo está traducido al español y al inglés.

## Requisitos

- **Minecraft Java Edition 26.2**
- **JDK 25** ([Adoptium](https://adoptium.net/)) — Minecraft 26.x lo exige
- **Fabric Loader 0.19.3+** y **Fabric API**

## Compilar

```bash
cd minecraft/zarlippita

# Solo la primera vez, para crear el wrapper:
gradle wrapper --gradle-version 9.5.1

./gradlew build
```

El `.jar` sale en `build/libs/zarlippita-1.0.0.jar`.

> **No pude compilarlo aquí:** el entorno donde se generó no tiene Java ni
> acceso a los repos de Fabric. Revisé el código y los recursos estáticamente
> (JSON válidos, referencias cruzadas, imports), pero no ha pasado por el
> compilador, así que puede quedar algún detalle al primer build.

## Probar en el juego

```bash
./gradlew runClient
```

Te abre un Minecraft 26.2 con el mod ya cargado, sin instalar nada. Dentro:

```
/give @s zarlippita:zarlippite_pickaxe
/give @s zarlippita:zarlippite
```

Para ver la mena generada, crea un mundo nuevo y baja a una cueva (Y entre -60 y 20).

## Instalar para jugar de verdad

1. Instala **Fabric Loader** desde [fabricmc.net/use](https://fabricmc.net/use)
2. Descarga **Fabric API** desde [Modrinth](https://modrinth.com/mod/fabric-api) (versión 26.2)
3. Copia `fabric-api.jar` y `zarlippita-1.0.0.jar` a la carpeta `mods`:
   - Windows: `%APPDATA%\.minecraft\mods`
   - Linux: `~/.minecraft/mods`
   - macOS: `~/Library/Application Support/minecraft/mods`
4. Abre el launcher y elige el perfil de Fabric

**Si es para un servidor, todos los jugadores tienen que hacer estos pasos.** Es
la diferencia con un plugin.

## Cómo cambiar cosas

**Que el mineral sea más común** — en
`data/zarlippita/worldgen/placed_feature/ore_zarlippite.json`, sube el `count`
(vetas por chunk) o el `size` del configured_feature (bloques por veta).

**Que el pico sea más fuerte** — en `ModToolMaterials.java`, toca la
durabilidad, la velocidad o la encantabilidad.

**Cambiar las texturas** — edita `tools/generate_textures.py` y ejecútalo:

```bash
python3 tools/generate_textures.py
```

Las texturas están dibujadas como mapas de letras, así que se editan sin saber
de gráficos. Por ejemplo, la gema:

```python
GEM = [
    "................",
    "......DDDD......",   #  .  transparente
    ".....DMMMMD.....",   #  D  cian oscuro
    "....DMSSMMMD....",   #  M  cian medio
    ...                   #  L  cian claro
]                         #  S  brillo
```

También puedes reemplazar los PNG a mano con cualquier editor; solo tienen que
ser de 16x16.

## Estructura

```
src/main/java/dev/zarlipp/zarlippita/
├── Zarlippita.java          # punto de entrada
├── ModItems.java            # gema y pico
├── ModBlocks.java           # mena y bloque compacto
├── ModToolMaterials.java    # stats del pico
├── ModTags.java             # etiqueta de reparación
└── ModWorldGeneration.java  # en qué biomas aparece la mena

src/main/resources/
├── fabric.mod.json          # metadatos del mod
├── assets/zarlippita/       # texturas, modelos, traducciones
└── data/
    ├── zarlippita/          # recetas, drops, worldgen
    └── minecraft/tags/      # marca la mena como "picable"
```

## Notas técnicas (por si vienes de tutoriales viejos)

Minecraft 26.x rompió muchas cosas. Si comparas con guías de 1.21, verás
diferencias que **no son errores**:

- **Yarn está muerto.** Desde 26.1 Mojang publica el juego sin ofuscar y Fabric
  usa los nombres oficiales. Es `ResourceLocation`, no `Identifier`;
  `Item.Properties`, no `Item.Settings`.
- **En `build.gradle` no hay línea de `mappings`.** Ya no hace falta ninguna.
- **El plugin es `net.fabricmc.fabric-loom`**, no el viejo `fabric-loom`.
- **Se usa `implementation`, no `modImplementation`** (que ya no existe).
- **Los picos ya no son `PickaxeItem`.** Desde 1.21.5 se registra un `Item`
  normal con `Properties.pickaxe(...)`.
- **Cada item necesita su `ResourceKey` vía `setId(...)`** o el juego peta al
  arrancar con "Item id not set".
- **`ItemGroupEvents` ahora es `CreativeModeTabEvents`** y cambió de paquete.

# ZarMining

Plugin de **Paper 26.2** con sistema de minería por niveles. Es la versión
Minecraft del recurso `esx_mining` de FiveM que ya está en este repositorio:
misma fórmula de XP y misma idea de picos con nivel requerido.

## Requisitos

- **JDK 25** (obligatorio para Minecraft 26.x) — [Adoptium](https://adoptium.net/)
- Un servidor **Paper 26.2** (o 26.1.2 cambiando una línea, ver abajo)
- Conexión a internet la primera vez (Gradle descarga la API)

## Compilar

```bash
cd minecraft/zarmining

# Si no tienes el wrapper todavia (solo la primera vez):
gradle wrapper --gradle-version 9.5.1

./gradlew build
```

El `.jar` queda en `build/libs/ZarMining-1.0.0.jar`. Cópialo a la carpeta
`plugins/` de tu servidor y reinicia.

> **Nota:** este proyecto se generó en un entorno sin acceso a los repositorios
> Maven, así que no pudo compilarse ahí. En tu máquina, con JDK 25 e internet,
> `./gradlew build` debería funcionar directamente.

### Probar sin servidor propio

Descomenta en `build.gradle.kts` el plugin `xyz.jpenilla.run-paper` y el bloque
`runServer`, y luego:

```bash
./gradlew runServer
```

Te levanta un Paper 26.2 con el plugin ya cargado.

## Apuntar a Paper 26.1.2 (más estable)

Paper 26.2 todavía está en canal experimental. Si prefieres la rama estable,
en `build.gradle.kts`:

```kotlin
compileOnly("io.papermc.paper:paper-api:26.1.2.build.+")
```

y en `build.gradle.kts` → `processResources`, cambia `"apiVersion" to "26.1"`.
Quita también `SULFUR` y `CINNABAR` del `config.yml` (no existen antes de 26.2;
el plugin los ignora con un aviso, pero así evitas ruido en consola).

## Uso

| Comando | Permiso | Qué hace |
|---|---|---|
| `/mineria` | `zarmining.use` (todos) | Tu nivel, XP y bloques picados |
| `/mineria top` | `zarmining.use` | Top 10 de mineros |
| `/mineria reload` | `zarmining.admin` (op) | Recarga `config.yml` |
| `/mineria reset <jugador>` | `zarmining.admin` | Borra el progreso de alguien |

**Vein miner:** a partir del nivel 15 (configurable), agáchate mientras picas y
se rompe la veta conectada entera, hasta 32 bloques.

## Configuración

Todo vive en `plugins/ZarMining/config.yml`, generado al primer arranque.

```yaml
leveling:
  max-level: 100
  base-xp: 100        # XP para pasar de nivel 1 a 2
  xp-per-level: 75    # se suma por cada nivel: 100, 175, 250, 325...

rules:
  require-pickaxe: true        # sin pico no hay XP
  ignore-player-placed: true   # anti-farmeo de colocar y romper
  action-bar: true

vein-miner:
  enabled: true
  required-level: 15
  max-blocks: 32

blocks:
  DIAMOND_ORE:
    xp: 45
    double-drop-chance: 0.10   # 10% de soltar un diamante extra
    extra-drops:
      - DIAMOND
  SULFUR:      # nuevo en 26.2
    xp: 16
  CINNABAR:    # nuevo en 26.2
    xp: 24

pickaxes:
  NETHERITE_PICKAXE:
    label: "Pico de netherita"
    required-level: 12    # por debajo de nv.12 no puedes ni usarlo
    xp-multiplier: 1.8

level-rewards:
  10:
    - "give %player% minecraft:diamond 3"
```

Los materiales se resuelven por nombre en tiempo de ejecución, no con constantes
del enum: si Mojang añade bloques en 26.3, los añades al `config.yml` y funcionan
sin recompilar. Si pones un bloque que no existe en tu versión, se ignora con un
aviso en consola en vez de romper el arranque.

### Mensajes

Usan [MiniMessage](https://docs.advntr.dev/minimessage/format.html):

```yaml
messages:
  level-up: "<green>¡Subiste al nivel <bold><level></bold> de minería!"
```

Placeholders disponibles: `<level>`, `<xp>`, `<xp_needed>`, `<xp_gained>`,
`<blocks>`, `<player>`, `<tool>`, `<position>`.

## Estructura

```
src/main/java/dev/zarlipp/zarmining/
├── ZarMiningPlugin.java      # arranque, comando, guardado periódico
├── MiningConfig.java         # lectura tipada de config.yml
├── MiningProfile.java        # nivel, XP y subida de nivel de un jugador
├── MiningStorage.java        # persistencia en data.yml + ranking
├── MiningListener.java       # XP al picar, vein miner, anti-farmeo
├── MiningCommand.java        # /mineria y subcomandos
└── PlacedBlockTracker.java   # marca bloques colocados (PDC del chunk)
```

El progreso se guarda en `plugins/ZarMining/data.yml` cada 5 minutos y al apagar.
Para migrar a MySQL solo hay que reescribir `MiningStorage`.

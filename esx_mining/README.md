# esx_mining

Script de minería libre para ESX Legacy (sin job obligatorio), usando:
- es_extended
- ox_inventory
- ox_target
- ox_lib
- oxmysql

## Incluye
- Animación de picar + prop en mano
- Barra de progreso
- Notificaciones
- XP + niveles
- Tipos de pico con progreso mínimo por nivel
- Multiidioma (`es` y `en`)
- Logs a Discord
- Auto creación de tabla SQL al iniciar recurso
- Comando `/mining` para ver progreso
- Comando admin `/miningreset [id]`

## Instalación
1. Copia la carpeta `esx_mining` a tus resources.
2. Asegura dependencias en tu servidor.
3. Añade en `server.cfg`:
   ```cfg
   ensure ox_lib
   ensure oxmysql
   ensure ox_inventory
   ensure ox_target
   ensure es_extended
   ensure esx_mining
   ```
4. Configura `Config.DiscordWebhook` en `config.lua`.
5. Ajusta coordenadas de minería en `Config.MiningNodes`.

## Items sugeridos (ox_inventory)
Añade los items en tu `data/items.lua`:

```lua
['rock'] = {
    label = 'Roca',
    weight = 500,
    stack = true,
    close = true,
    description = 'Una roca sin refinar.'
},

['pickaxe_rusty'] = {
    label = 'Pico Oxidado',
    weight = 2000,
    stack = false,
    close = true,
    description = 'Pico básico para minería.'
},

['pickaxe_iron'] = {
    label = 'Pico de Hierro',
    weight = 2200,
    stack = false,
    close = true,
    description = 'Pico intermedio para minería.'
},

['pickaxe_steel'] = {
    label = 'Pico de Acero',
    weight = 2400,
    stack = false,
    close = true,
    description = 'Pico avanzado para minería.'
}
```

## Recomendaciones futuras
- Durabilidad real por metadata en cada pico.
- Skillcheck (`lib.skillCheck`) para anti-macro.
- Sistema de nodos con respawn/ocupación.
- Refinado roca -> minerales en estación de fundición.

package dev.zarlipp.zarlippita;

import net.fabricmc.api.ModInitializer;
import net.minecraft.resources.ResourceLocation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Punto de entrada del mod Zarlippita.
 *
 * Anade un mineral nuevo (zarlippita) con su gema, bloque compacto y pico,
 * que genera de forma natural en las cuevas del Overworld.
 *
 * IMPORTANTE: desde Minecraft 26.1 el juego se publica SIN ofuscar y los
 * mappings de Yarn ya no se soportan. Todo este codigo usa los nombres
 * oficiales de Mojang (ResourceLocation, Item.Properties, BuiltInRegistries...).
 */
public class Zarlippita implements ModInitializer {

    public static final String MOD_ID = "zarlippita";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    /** Crea un ResourceLocation dentro del namespace del mod. */
    public static ResourceLocation id(String path) {
        return ResourceLocation.fromNamespaceAndPath(MOD_ID, path);
    }

    @Override
    public void onInitialize() {
        // El orden importa: los bloques crean BlockItems, asi que van primero.
        ModBlocks.initialize();
        ModItems.initialize();
        ModWorldGeneration.initialize();

        LOGGER.info("Zarlippita cargado. A picar!");
    }
}

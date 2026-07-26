package dev.zarlipp.zarlippita;

import net.fabricmc.fabric.api.biome.v1.BiomeModifications;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.level.levelgen.GenerationStep;
import net.minecraft.world.level.levelgen.placement.PlacedFeature;

/**
 * Hace que el mineral aparezca de forma natural al generar el mundo.
 *
 * La "receta" de generacion (tamano de veta, profundidad, frecuencia) se define
 * en JSON dentro de data/zarlippita/worldgen/. Aqui solo le decimos al juego
 * en que biomas debe aplicarla.
 */
public final class ModWorldGeneration {

    private ModWorldGeneration() {
    }

    private static final ResourceKey<PlacedFeature> ZARLIPPITE_ORE_PLACED =
            ResourceKey.create(Registries.PLACED_FEATURE, Zarlippita.id("ore_zarlippite"));

    public static void initialize() {
        // En todos los biomas del Overworld, durante la fase de generacion de minerales.
        BiomeModifications.addFeature(
                BiomeSelectors.foundInOverworld(),
                GenerationStep.Decoration.UNDERGROUND_ORES,
                ZARLIPPITE_ORE_PLACED
        );
    }
}

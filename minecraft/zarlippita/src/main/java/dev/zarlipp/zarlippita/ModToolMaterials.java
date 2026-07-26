package dev.zarlipp.zarlippita;

import net.minecraft.tags.BlockTags;
import net.minecraft.world.item.ToolMaterial;

/** Material del pico de zarlippita. */
public final class ModToolMaterials {

    private ModToolMaterials() {
    }

    /**
     * Comparativa rapida con el vanilla:
     *   diamante  -> 1561 usos, velocidad 8.0,  bonus dano 3.0, encantabilidad 10
     *   netherita -> 2031 usos, velocidad 9.0,  bonus dano 4.0, encantabilidad 15
     *   zarlippita-> 2200 usos, velocidad 10.0, bonus dano 4.0, encantabilidad 22
     *
     * Usa la etiqueta de netherita para saber que NO puede minar, asi que
     * rompe absolutamente todo lo que rompe un pico de netherita.
     */
    public static final ToolMaterial ZARLIPPITE = new ToolMaterial(
            BlockTags.INCORRECT_FOR_NETHERITE_TOOL, // bloques que no dropean con este pico
            2200,                                   // durabilidad
            10.0F,                                  // velocidad de minado
            4.0F,                                   // bonus de dano
            22,                                     // encantabilidad
            ModTags.Items.ZARLIPPITE_TOOL_MATERIALS  // con que se repara en el yunque
    );
}

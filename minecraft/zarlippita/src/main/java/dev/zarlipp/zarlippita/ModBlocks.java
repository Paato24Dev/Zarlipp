package dev.zarlipp.zarlippita;

import net.fabricmc.fabric.api.creativetab.v1.CreativeModeTabEvents;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.util.valueproviders.UniformInt;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.DropExperienceBlock;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;

import java.util.function.Function;

/**
 * Bloques del mod: el mineral en bruto y el bloque compacto.
 *
 * Igual que los items, desde 1.21.2 el ResourceKey va dentro de las Properties
 * (via setId) tanto del bloque como de su BlockItem.
 */
public final class ModBlocks {

    private ModBlocks() {
    }

    /**
     * Mineral de zarlippita. DropExperienceBlock hace que suelte XP al picarlo,
     * igual que el carbon o el diamante.
     */
    public static final Block ZARLIPPITE_ORE = register(
            "zarlippite_ore",
            properties -> new DropExperienceBlock(UniformInt.of(4, 9), properties),
            BlockBehaviour.Properties.of()
                    .mapColor(MapColor.COLOR_CYAN)
                    .strength(4.5F, 3.0F)   // dureza, resistencia a explosiones
                    .requiresCorrectToolForDrops()
                    .sound(SoundType.DEEPSLATE),
            true
    );

    /** Bloque compacto, para almacenar 9 gemas. */
    public static final Block ZARLIPPITE_BLOCK = register(
            "zarlippite_block",
            Block::new,
            BlockBehaviour.Properties.of()
                    .mapColor(MapColor.COLOR_CYAN)
                    .strength(5.0F, 6.0F)
                    .requiresCorrectToolForDrops()
                    .sound(SoundType.METAL),
            true
    );

    private static Block register(String name,
                                  Function<BlockBehaviour.Properties, Block> factory,
                                  BlockBehaviour.Properties properties,
                                  boolean withItem) {
        ResourceKey<Block> blockKey = ResourceKey.create(Registries.BLOCK, Zarlippita.id(name));
        Block block = factory.apply(properties.setId(blockKey));

        if (withItem) {
            ResourceKey<Item> itemKey = ResourceKey.create(Registries.ITEM, Zarlippita.id(name));
            BlockItem blockItem = new BlockItem(block, new Item.Properties()
                    .setId(itemKey)
                    .useBlockDescriptionPrefix());
            Registry.register(BuiltInRegistries.ITEM, itemKey, blockItem);
        }

        return Registry.register(BuiltInRegistries.BLOCK, blockKey, block);
    }

    /** Carga la clase y anade los bloques a la pestana de bloques de construccion. */
    public static void initialize() {
        CreativeModeTabEvents.modifyOutputEvent(CreativeModeTabs.BUILDING_BLOCKS)
                .register(tab -> {
                    tab.accept(ZARLIPPITE_ORE);
                    tab.accept(ZARLIPPITE_BLOCK);
                });
    }
}

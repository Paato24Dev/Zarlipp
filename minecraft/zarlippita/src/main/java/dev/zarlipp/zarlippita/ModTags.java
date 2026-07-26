package dev.zarlipp.zarlippita;

import net.minecraft.core.registries.Registries;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.Item;

/** Etiquetas propias del mod. */
public final class ModTags {

    private ModTags() {
    }

    public static final class Items {

        private Items() {
        }

        /**
         * Items validos para reparar el pico en el yunque.
         * El contenido se define en data/zarlippita/tags/item/zarlippite_tool_materials.json
         */
        public static final TagKey<Item> ZARLIPPITE_TOOL_MATERIALS =
                TagKey.create(Registries.ITEM, Zarlippita.id("zarlippite_tool_materials"));
    }
}

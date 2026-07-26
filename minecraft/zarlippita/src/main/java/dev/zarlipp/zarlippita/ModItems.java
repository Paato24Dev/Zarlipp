package dev.zarlipp.zarlippita;

import net.fabricmc.fabric.api.creativetab.v1.CreativeModeTabEvents;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;

import java.util.function.Function;

/**
 * Items del mod: la gema y el pico.
 *
 * Desde 1.21.2 cada item necesita su ResourceKey metido en las Properties
 * (via setId), o el juego revienta con "Item id not set" al arrancar.
 */
public final class ModItems {

    private ModItems() {
    }

    /** La gema que sueltas al picar el mineral. */
    public static final Item ZARLIPPITE = register(
            "zarlippite",
            Item::new,
            new Item.Properties()
    );

    /**
     * Pico de zarlippita: mas rapido y resistente que el de diamante.
     *
     * Desde 1.21.5 los picos ya no son una clase PickaxeItem: se registra un
     * Item normal y se le aplica el comportamiento con Properties.pickaxe(...).
     */
    public static final Item ZARLIPPITE_PICKAXE = register(
            "zarlippite_pickaxe",
            Item::new,
            new Item.Properties().pickaxe(ModToolMaterials.ZARLIPPITE, 1.0F, -2.8F)
    );

    private static Item register(String name, Function<Item.Properties, Item> factory, Item.Properties properties) {
        ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, Zarlippita.id(name));
        Item item = factory.apply(properties.setId(key));
        return Registry.register(BuiltInRegistries.ITEM, key, item);
    }

    /** Carga la clase y mete los items en las pestanas del inventario creativo. */
    public static void initialize() {
        CreativeModeTabEvents.modifyOutputEvent(CreativeModeTabs.INGREDIENTS)
                .register(tab -> tab.accept(ZARLIPPITE));

        CreativeModeTabEvents.modifyOutputEvent(CreativeModeTabs.TOOLS_AND_UTILITIES)
                .register(tab -> tab.accept(ZARLIPPITE_PICKAXE));
    }
}

package dev.zarlipp.zarmining;

import org.bukkit.Chunk;
import org.bukkit.block.Block;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;

import java.util.Arrays;

/**
 * Registra los bloques colocados por jugadores para que no otorguen XP.
 *
 * Guarda las posiciones en el PersistentDataContainer del chunk, asi que
 * sobrevive a reinicios del servidor (a diferencia de los metadatos de bloque).
 * Cada posicion se codifica en un long: y (32 bits) | x (4 bits) | z (4 bits).
 */
public final class PlacedBlockTracker {

    private final ZarMiningPlugin plugin;

    public PlacedBlockTracker(ZarMiningPlugin plugin) {
        this.plugin = plugin;
    }

    private static long encode(Block block) {
        long x = block.getX() & 0xF;
        long z = block.getZ() & 0xF;
        long y = block.getY() & 0xFFFFFFFFL;
        return (y << 8) | (x << 4) | z;
    }

    private long[] read(Chunk chunk) {
        PersistentDataContainer container = chunk.getPersistentDataContainer();
        long[] stored = container.get(plugin.placedBlocksKey(), PersistentDataType.LONG_ARRAY);
        return stored == null ? new long[0] : stored;
    }

    private void write(Chunk chunk, long[] values) {
        PersistentDataContainer container = chunk.getPersistentDataContainer();
        if (values.length == 0) {
            container.remove(plugin.placedBlocksKey());
        } else {
            container.set(plugin.placedBlocksKey(), PersistentDataType.LONG_ARRAY, values);
        }
    }

    /** Marca un bloque como colocado por un jugador. */
    public void mark(Block block) {
        long key = encode(block);
        long[] current = read(block.getChunk());
        for (long value : current) {
            if (value == key) {
                return;
            }
        }
        long[] updated = Arrays.copyOf(current, current.length + 1);
        updated[current.length] = key;
        write(block.getChunk(), updated);
    }

    /** true si el bloque lo puso un jugador. */
    public boolean isPlaced(Block block) {
        long key = encode(block);
        for (long value : read(block.getChunk())) {
            if (value == key) {
                return true;
            }
        }
        return false;
    }

    /**
     * Quita la marca de un bloque.
     *
     * @return true si el bloque estaba marcado.
     */
    public boolean unmark(Block block) {
        long key = encode(block);
        long[] current = read(block.getChunk());
        int index = -1;
        for (int i = 0; i < current.length; i++) {
            if (current[i] == key) {
                index = i;
                break;
            }
        }
        if (index < 0) {
            return false;
        }
        long[] updated = new long[current.length - 1];
        System.arraycopy(current, 0, updated, 0, index);
        System.arraycopy(current, index + 1, updated, index, current.length - index - 1);
        write(block.getChunk(), updated);
        return true;
    }
}

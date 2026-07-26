package dev.zarlipp.zarmining;

import org.bukkit.NamespacedKey;
import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * ZarMining - sistema de mineria con niveles, XP y recompensas para Paper 26.2.
 *
 * Portado en espiritu desde el recurso esx_mining de este mismo repositorio:
 * misma formula de XP (100 + (nivel - 1) * 75) y la misma idea de picos con
 * multiplicadores y niveles requeridos.
 */
public final class ZarMiningPlugin extends JavaPlugin {

    private MiningConfig miningConfig;
    private MiningStorage storage;
    private NamespacedKey placedBlocksKey;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        this.placedBlocksKey = new NamespacedKey(this, "placed_blocks");
        this.miningConfig = new MiningConfig(this);
        this.storage = new MiningStorage(this);

        this.miningConfig.load();
        this.storage.load();

        getServer().getPluginManager().registerEvents(new MiningListener(this), this);

        PluginCommand command = getCommand("mineria");
        if (command != null) {
            MiningCommand executor = new MiningCommand(this);
            command.setExecutor(executor);
            command.setTabCompleter(executor);
        } else {
            getLogger().warning("No se pudo registrar el comando /mineria (revisa plugin.yml).");
        }

        // Guardado periodico asincrono para no perder progreso si el server se cae.
        long everyTicks = 20L * 60L * 5L; // 5 minutos
        getServer().getScheduler().runTaskTimerAsynchronously(this, storage::saveQuietly, everyTicks, everyTicks);

        getLogger().info("ZarMining activado. Bloques con recompensa: " + miningConfig.rewardCount());
    }

    @Override
    public void onDisable() {
        if (storage != null) {
            storage.saveQuietly();
        }
    }

    public MiningConfig miningConfig() {
        return miningConfig;
    }

    public MiningStorage storage() {
        return storage;
    }

    public NamespacedKey placedBlocksKey() {
        return placedBlocksKey;
    }

    public void reloadEverything() {
        reloadConfig();
        miningConfig.load();
    }
}

package dev.zarlipp.zarmining;

import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.Material;
import org.bukkit.Sound;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/** Toda la logica que ocurre al colocar y romper bloques. */
public final class MiningListener implements Listener {

    private static final MiniMessage MM = MiniMessage.miniMessage();

    private final ZarMiningPlugin plugin;
    private final PlacedBlockTracker tracker;

    /**
     * Jugadores que estan ejecutando el vein miner ahora mismo.
     * El vein miner lanza BlockBreakEvent sinteticos para que los plugins de
     * proteccion puedan cancelarlos; sin esta marca, nuestro propio onBreak
     * los procesaria otra vez y entraria en recursion infinita.
     */
    private final Set<UUID> veinMining = new HashSet<>();

    public MiningListener(ZarMiningPlugin plugin) {
        this.plugin = plugin;
        this.tracker = new PlacedBlockTracker(plugin);
    }

    /** Marca los bloques colocados por jugadores: colocar y romper no da XP. */
    @EventHandler(ignoreCancelled = true, priority = EventPriority.MONITOR)
    public void onPlace(BlockPlaceEvent event) {
        if (!plugin.miningConfig().ignorePlayerPlaced()) {
            return;
        }
        Block block = event.getBlock();
        if (plugin.miningConfig().isRewardBlock(block.getType())) {
            tracker.mark(block);
        }
    }

    @EventHandler(ignoreCancelled = true, priority = EventPriority.MONITOR)
    public void onBreak(BlockBreakEvent event) {
        Player player = event.getPlayer();
        if (player.getGameMode() == GameMode.CREATIVE || !player.hasPermission("zarmining.use")) {
            return;
        }
        if (veinMining.contains(player.getUniqueId())) {
            return; // evento sintetico del vein miner: ya se contabiliza aparte.
        }

        Block block = event.getBlock();
        MiningConfig config = plugin.miningConfig();
        MiningConfig.Reward reward = config.reward(block.getType());
        if (reward == null) {
            return;
        }
        if (config.ignorePlayerPlaced() && tracker.unmark(block)) {
            return; // lo habia colocado un jugador: nada de XP.
        }

        ItemStack inHand = player.getInventory().getItemInMainHand();
        MiningConfig.Tool tool = config.tool(inHand.getType());

        if (config.requireCorrectTool() && tool == null) {
            return; // rompio con la mano o con algo que no es pico.
        }

        MiningProfile profile = plugin.storage().profile(player.getUniqueId(), player.getName());

        if (tool != null && profile.level() < tool.requiredLevel()) {
            event.setCancelled(true);
            send(player, "level-required",
                    Placeholder.unparsed("level", String.valueOf(tool.requiredLevel())),
                    Placeholder.unparsed("tool", tool.label()));
            player.playSound(player.getLocation(), Sound.BLOCK_NOTE_BLOCK_BASS, 0.7F, 0.8F);
            return;
        }

        double multiplier = tool != null ? tool.xpMultiplier() : 1.0D;
        grant(player, profile, block, reward, multiplier, true);

        if (config.veinMinerEnabled()
                && profile.level() >= config.veinMinerLevel()
                && player.isSneaking()) {
            runVeinMiner(player, profile, block, multiplier);
        }
    }

    private void grant(Player player, MiningProfile profile, Block block,
                       MiningConfig.Reward reward, double multiplier, boolean showActionBar) {
        int xp = (int) Math.round(reward.xp() * multiplier);
        int before = profile.level();
        int levelsGained = profile.addXp(xp, plugin.miningConfig());
        profile.addBlock();

        if (!reward.extraDrops().isEmpty()
                && ThreadLocalRandom.current().nextDouble() < reward.doubleDropChance()) {
            for (Material extra : reward.extraDrops()) {
                block.getWorld().dropItemNaturally(block.getLocation().toCenterLocation(), new ItemStack(extra));
            }
            player.playSound(player.getLocation(), Sound.ENTITY_ITEM_PICKUP, 0.6F, 1.6F);
        }

        if (showActionBar && plugin.miningConfig().actionBarEnabled()) {
            int needed = plugin.miningConfig().xpRequiredFor(profile.level());
            player.sendActionBar(MM.deserialize(
                    plugin.miningConfig().message("action-bar"),
                    Placeholder.unparsed("xp_gained", String.valueOf(xp)),
                    Placeholder.unparsed("level", String.valueOf(profile.level())),
                    Placeholder.unparsed("xp", String.valueOf(profile.xp())),
                    Placeholder.unparsed("xp_needed", String.valueOf(needed))));
        }

        for (int i = 1; i <= levelsGained; i++) {
            int newLevel = before + i;
            send(player, "level-up", Placeholder.unparsed("level", String.valueOf(newLevel)));
            player.playSound(player.getLocation(), Sound.ENTITY_PLAYER_LEVELUP, 1.0F, 1.2F);
            for (String raw : plugin.miningConfig().commandsForLevel(newLevel)) {
                String command = raw.replace("%player%", player.getName())
                        .replace("%level%", String.valueOf(newLevel));
                Bukkit.dispatchCommand(Bukkit.getConsoleSender(), command);
            }
        }
    }

    /**
     * Vein miner: rompe la veta conectada del mismo material, con tope configurable.
     * Se activa agachandose al picar, a partir del nivel indicado en la config.
     */
    private void runVeinMiner(Player player, MiningProfile profile, Block origin, double multiplier) {
        Material target = origin.getType();
        MiningConfig.Reward reward = plugin.miningConfig().reward(target);
        if (reward == null) {
            return;
        }

        int max = plugin.miningConfig().veinMinerMaxBlocks();
        boolean skipPlaced = plugin.miningConfig().ignorePlayerPlaced();
        Set<Block> visited = new HashSet<>();
        Deque<Block> queue = new ArrayDeque<>();
        List<Block> toBreak = new ArrayList<>();
        visited.add(origin);
        queue.add(origin);

        while (!queue.isEmpty() && toBreak.size() < max) {
            Block current = queue.poll();
            for (int dx = -1; dx <= 1 && toBreak.size() < max; dx++) {
                for (int dy = -1; dy <= 1 && toBreak.size() < max; dy++) {
                    for (int dz = -1; dz <= 1 && toBreak.size() < max; dz++) {
                        if (dx == 0 && dy == 0 && dz == 0) {
                            continue;
                        }
                        Block neighbour = current.getRelative(dx, dy, dz);
                        if (neighbour.getType() != target || !visited.add(neighbour)) {
                            continue;
                        }
                        if (skipPlaced && tracker.isPlaced(neighbour)) {
                            continue;
                        }
                        toBreak.add(neighbour);
                        queue.add(neighbour);
                    }
                }
            }
        }

        ItemStack tool = player.getInventory().getItemInMainHand();
        int broken = 0;
        veinMining.add(player.getUniqueId());
        try {
            for (Block block : toBreak) {
                // Lanzamos un BlockBreakEvent por bloque para que los plugins de
                // proteccion (WorldGuard, GriefPrevention, Towny...) puedan cancelarlo.
                // Sin esto, el vein miner se saltaria las regiones protegidas.
                BlockBreakEvent probe = new BlockBreakEvent(block, player);
                Bukkit.getPluginManager().callEvent(probe);
                if (probe.isCancelled()) {
                    continue;
                }

                block.breakNaturally(tool);
                grant(player, profile, block, reward, multiplier, false);
                broken++;
            }
        } finally {
            veinMining.remove(player.getUniqueId());
        }

        if (broken > 0) {
            send(player, "vein-miner", Placeholder.unparsed("blocks", String.valueOf(broken)));
        }
    }

    private void send(Player player, String key, TagResolver... tags) {
        String raw = plugin.miningConfig().message(key);
        if (raw == null || raw.isBlank()) {
            return;
        }
        player.sendMessage(MM.deserialize(raw, tags));
    }
}

package dev.zarlipp.zarmining;

import org.bukkit.Material;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Lectura tipada de config.yml.
 *
 * Los materiales se resuelven con Material.matchMaterial(String) en lugar de
 * constantes del enum: asi el plugin compila y arranca aunque Mojang renombre o
 * anada bloques (sulfur, cinnabar, etc.) en la siguiente game drop.
 */
public final class MiningConfig {

    /** Recompensa configurada para un bloque concreto. */
    public record Reward(int xp, double doubleDropChance, List<Material> extraDrops) {
    }

    /** Datos de un pico: nivel minimo y multiplicador de XP. */
    public record Tool(String label, int requiredLevel, double xpMultiplier) {
    }

    private final ZarMiningPlugin plugin;

    private final Map<Material, Reward> rewards = new EnumMap<>(Material.class);
    private final Map<Material, Tool> tools = new EnumMap<>(Material.class);
    private final Map<String, String> messages = new HashMap<>();
    private final Map<Integer, List<String>> levelCommands = new HashMap<>();

    private int maxLevel = 100;
    private int levelBase = 100;
    private int levelStep = 75;
    private boolean requireCorrectTool = true;
    private boolean ignorePlayerPlaced = true;
    private boolean actionBarEnabled = true;
    private boolean veinMinerEnabled = true;
    private int veinMinerLevel = 15;
    private int veinMinerMaxBlocks = 32;

    public MiningConfig(ZarMiningPlugin plugin) {
        this.plugin = plugin;
    }

    public void load() {
        FileConfiguration cfg = plugin.getConfig();

        this.maxLevel = Math.max(1, cfg.getInt("leveling.max-level", 100));
        this.levelBase = cfg.getInt("leveling.base-xp", 100);
        this.levelStep = cfg.getInt("leveling.xp-per-level", 75);
        this.requireCorrectTool = cfg.getBoolean("rules.require-pickaxe", true);
        this.ignorePlayerPlaced = cfg.getBoolean("rules.ignore-player-placed", true);
        this.actionBarEnabled = cfg.getBoolean("rules.action-bar", true);
        this.veinMinerEnabled = cfg.getBoolean("vein-miner.enabled", true);
        this.veinMinerLevel = cfg.getInt("vein-miner.required-level", 15);
        this.veinMinerMaxBlocks = Math.max(1, cfg.getInt("vein-miner.max-blocks", 32));

        loadRewards(cfg.getConfigurationSection("blocks"));
        loadTools(cfg.getConfigurationSection("pickaxes"));
        loadMessages(cfg.getConfigurationSection("messages"));
        loadLevelCommands(cfg.getConfigurationSection("level-rewards"));
    }

    private void loadRewards(ConfigurationSection section) {
        rewards.clear();
        if (section == null) {
            return;
        }
        for (String key : section.getKeys(false)) {
            Material material = matchMaterial(key);
            if (material == null || !material.isBlock()) {
                plugin.getLogger().warning("Bloque desconocido en config 'blocks." + key + "', se ignora.");
                continue;
            }
            ConfigurationSection entry = section.getConfigurationSection(key);
            if (entry == null) {
                rewards.put(material, new Reward(section.getInt(key, 0), 0.0D, List.of()));
                continue;
            }
            int xp = entry.getInt("xp", 0);
            double chance = entry.getDouble("double-drop-chance", 0.0D);
            List<Material> extras = new ArrayList<>();
            for (String raw : entry.getStringList("extra-drops")) {
                Material extra = matchMaterial(raw);
                if (extra != null && extra.isItem()) {
                    extras.add(extra);
                } else {
                    plugin.getLogger().warning("Drop extra desconocido '" + raw + "' en 'blocks." + key + "'.");
                }
            }
            rewards.put(material, new Reward(xp, chance, List.copyOf(extras)));
        }
    }

    private void loadTools(ConfigurationSection section) {
        tools.clear();
        if (section == null) {
            return;
        }
        for (String key : section.getKeys(false)) {
            Material material = matchMaterial(key);
            if (material == null) {
                plugin.getLogger().warning("Pico desconocido en config 'pickaxes." + key + "', se ignora.");
                continue;
            }
            ConfigurationSection entry = section.getConfigurationSection(key);
            if (entry == null) {
                continue;
            }
            tools.put(material, new Tool(
                    entry.getString("label", material.name()),
                    entry.getInt("required-level", 1),
                    entry.getDouble("xp-multiplier", 1.0D)
            ));
        }
    }

    private void loadMessages(ConfigurationSection section) {
        messages.clear();
        if (section == null) {
            return;
        }
        for (String key : section.getKeys(false)) {
            messages.put(key.toLowerCase(Locale.ROOT), section.getString(key, ""));
        }
    }

    private void loadLevelCommands(ConfigurationSection section) {
        levelCommands.clear();
        if (section == null) {
            return;
        }
        for (String key : section.getKeys(false)) {
            try {
                levelCommands.put(Integer.parseInt(key), List.copyOf(section.getStringList(key)));
            } catch (NumberFormatException ex) {
                plugin.getLogger().warning("Clave no numerica en 'level-rewards." + key + "', se ignora.");
            }
        }
    }

    private static Material matchMaterial(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return Material.matchMaterial(raw.trim().toUpperCase(Locale.ROOT));
    }

    // --- getters ---

    public Reward reward(Material material) {
        return rewards.get(material);
    }

    public boolean isRewardBlock(Material material) {
        return rewards.containsKey(material);
    }

    public int rewardCount() {
        return rewards.size();
    }

    public Tool tool(Material material) {
        return tools.get(material);
    }

    public String message(String key) {
        return messages.getOrDefault(key.toLowerCase(Locale.ROOT), "");
    }

    public List<String> commandsForLevel(int level) {
        return levelCommands.getOrDefault(level, List.of());
    }

    public int maxLevel() {
        return maxLevel;
    }

    /**
     * Misma progresion que Config.Experience.requiredForLevel de esx_mining.
     * Nunca devuelve menos de 1 para evitar subidas de nivel infinitas si
     * alguien pone base-xp en 0 o en negativo.
     */
    public int xpRequiredFor(int level) {
        return Math.max(1, levelBase + ((Math.max(1, level) - 1) * levelStep));
    }

    public boolean requireCorrectTool() {
        return requireCorrectTool;
    }

    public boolean ignorePlayerPlaced() {
        return ignorePlayerPlaced;
    }

    public boolean actionBarEnabled() {
        return actionBarEnabled;
    }

    public boolean veinMinerEnabled() {
        return veinMinerEnabled;
    }

    public int veinMinerLevel() {
        return veinMinerLevel;
    }

    public int veinMinerMaxBlocks() {
        return veinMinerMaxBlocks;
    }
}

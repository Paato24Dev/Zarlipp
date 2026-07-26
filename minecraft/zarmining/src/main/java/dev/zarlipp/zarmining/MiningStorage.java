package dev.zarlipp.zarmining;

import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Persistencia sencilla en data.yml.
 *
 * Suficiente para servidores pequenos y medianos. Si algun dia quieres MySQL
 * (como el oxmysql de esx_mining), solo hay que reimplementar esta clase.
 */
public final class MiningStorage {

    private final ZarMiningPlugin plugin;
    private final File file;
    private final Map<UUID, MiningProfile> profiles = new ConcurrentHashMap<>();

    public MiningStorage(ZarMiningPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "data.yml");
    }

    public void load() {
        profiles.clear();
        if (!file.exists()) {
            return;
        }
        YamlConfiguration yaml = YamlConfiguration.loadConfiguration(file);
        ConfigurationSection root = yaml.getConfigurationSection("players");
        if (root == null) {
            return;
        }
        for (String key : root.getKeys(false)) {
            ConfigurationSection entry = root.getConfigurationSection(key);
            if (entry == null) {
                continue;
            }
            try {
                UUID uuid = UUID.fromString(key);
                profiles.put(uuid, new MiningProfile(
                        uuid,
                        entry.getString("name", "?"),
                        entry.getInt("level", 1),
                        entry.getInt("xp", 0),
                        entry.getLong("blocks", 0L)
                ));
            } catch (IllegalArgumentException ex) {
                plugin.getLogger().warning("UUID invalido en data.yml: " + key);
            }
        }
        plugin.getLogger().info("Perfiles de mineria cargados: " + profiles.size());
    }

    public MiningProfile profile(UUID uuid, String name) {
        MiningProfile profile = profiles.computeIfAbsent(uuid, id -> MiningProfile.fresh(id, name));
        profile.lastKnownName(name);
        return profile;
    }

    public MiningProfile peek(UUID uuid) {
        return profiles.get(uuid);
    }

    /** Busca un perfil por el ultimo nombre conocido (para jugadores offline). */
    public MiningProfile findByName(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        for (MiningProfile profile : profiles.values()) {
            if (name.equalsIgnoreCase(profile.lastKnownName())) {
                return profile;
            }
        }
        return null;
    }

    public List<MiningProfile> top(int limit) {
        Comparator<MiningProfile> byLevel = Comparator.comparingInt(MiningProfile::level);
        Comparator<MiningProfile> byXp = Comparator.comparingInt(MiningProfile::xp);
        // Mayor nivel primero y, a igualdad de nivel, mayor XP.
        Comparator<MiningProfile> ranking = byLevel.thenComparing(byXp).reversed();

        List<MiningProfile> sorted = new ArrayList<>(profiles.values());
        sorted.sort(ranking);
        return List.copyOf(sorted.subList(0, Math.min(limit, sorted.size())));
    }

    public void save() throws IOException {
        YamlConfiguration yaml = new YamlConfiguration();
        for (MiningProfile profile : profiles.values()) {
            String path = "players." + profile.uuid();
            yaml.set(path + ".name", profile.lastKnownName());
            yaml.set(path + ".level", profile.level());
            yaml.set(path + ".xp", profile.xp());
            yaml.set(path + ".blocks", profile.blocksMined());
        }
        File parent = file.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IOException("No se pudo crear la carpeta " + parent);
        }
        yaml.save(file);
    }

    public void saveQuietly() {
        try {
            save();
        } catch (IOException ex) {
            plugin.getLogger().severe("Error guardando data.yml: " + ex.getMessage());
        }
    }
}

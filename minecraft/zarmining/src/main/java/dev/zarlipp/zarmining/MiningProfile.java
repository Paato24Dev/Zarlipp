package dev.zarlipp.zarmining;

import java.util.UUID;

/** Progreso de mineria de un jugador. */
public final class MiningProfile {

    private final UUID uuid;
    private String lastKnownName;
    private int level;
    private int xp;
    private long blocksMined;

    public MiningProfile(UUID uuid, String lastKnownName, int level, int xp, long blocksMined) {
        this.uuid = uuid;
        this.lastKnownName = lastKnownName;
        this.level = Math.max(1, level);
        this.xp = Math.max(0, xp);
        this.blocksMined = Math.max(0L, blocksMined);
    }

    public static MiningProfile fresh(UUID uuid, String name) {
        return new MiningProfile(uuid, name, 1, 0, 0L);
    }

    public UUID uuid() {
        return uuid;
    }

    public String lastKnownName() {
        return lastKnownName;
    }

    public void lastKnownName(String name) {
        if (name != null && !name.isBlank()) {
            this.lastKnownName = name;
        }
    }

    public int level() {
        return level;
    }

    public int xp() {
        return xp;
    }

    public long blocksMined() {
        return blocksMined;
    }

    public void addBlock() {
        this.blocksMined++;
    }

    /**
     * Anade XP y sube de nivel tantas veces como haga falta.
     *
     * @return numero de niveles ganados (0 si no subio).
     */
    public int addXp(int amount, MiningConfig config) {
        if (amount <= 0) {
            return 0;
        }
        this.xp += amount;

        int gained = 0;
        while (level < config.maxLevel()) {
            int needed = config.xpRequiredFor(level);
            if (xp < needed) {
                break;
            }
            xp -= needed;
            level++;
            gained++;
        }

        if (level >= config.maxLevel()) {
            level = config.maxLevel();
            xp = Math.min(xp, config.xpRequiredFor(level));
        }
        return gained;
    }

    public void reset() {
        this.level = 1;
        this.xp = 0;
        this.blocksMined = 0L;
    }
}

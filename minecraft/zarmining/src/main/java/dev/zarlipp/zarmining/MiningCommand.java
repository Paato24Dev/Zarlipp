package dev.zarlipp.zarmining;

import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** /mineria, /mineria top, /mineria reload, /mineria reset &lt;jugador&gt; */
public final class MiningCommand implements CommandExecutor, TabCompleter {

    private static final MiniMessage MM = MiniMessage.miniMessage();

    private final ZarMiningPlugin plugin;

    public MiningCommand(ZarMiningPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 0) {
            return showProfile(sender);
        }

        return switch (args[0].toLowerCase(Locale.ROOT)) {
            case "top" -> showTop(sender);
            case "reload" -> reload(sender);
            case "reset" -> reset(sender, args);
            default -> showProfile(sender);
        };
    }

    private boolean showProfile(CommandSender sender) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage(MM.deserialize("<red>Este comando es solo para jugadores. Usa /mineria top."));
            return true;
        }
        MiningProfile profile = plugin.storage().profile(player.getUniqueId(), player.getName());
        int needed = plugin.miningConfig().xpRequiredFor(profile.level());
        player.sendMessage(MM.deserialize(
                plugin.miningConfig().message("profile"),
                Placeholder.unparsed("level", String.valueOf(profile.level())),
                Placeholder.unparsed("xp", String.valueOf(profile.xp())),
                Placeholder.unparsed("xp_needed", String.valueOf(needed)),
                Placeholder.unparsed("blocks", String.valueOf(profile.blocksMined()))));
        return true;
    }

    private boolean showTop(CommandSender sender) {
        List<MiningProfile> top = plugin.storage().top(10);
        sender.sendMessage(MM.deserialize(plugin.miningConfig().message("top-header")));
        if (top.isEmpty()) {
            sender.sendMessage(MM.deserialize("<gray>  (todavia no hay nadie en el ranking)"));
            return true;
        }
        int position = 1;
        for (MiningProfile profile : top) {
            sender.sendMessage(MM.deserialize(
                    plugin.miningConfig().message("top-entry"),
                    Placeholder.unparsed("position", String.valueOf(position++)),
                    Placeholder.unparsed("player", profile.lastKnownName()),
                    Placeholder.unparsed("level", String.valueOf(profile.level())),
                    Placeholder.unparsed("blocks", String.valueOf(profile.blocksMined()))));
        }
        return true;
    }

    private boolean reload(CommandSender sender) {
        if (!sender.hasPermission("zarmining.admin")) {
            sender.sendMessage(MM.deserialize(plugin.miningConfig().message("no-permission")));
            return true;
        }
        plugin.reloadEverything();
        sender.sendMessage(MM.deserialize(plugin.miningConfig().message("reloaded")));
        return true;
    }

    private boolean reset(CommandSender sender, String[] args) {
        if (!sender.hasPermission("zarmining.admin")) {
            sender.sendMessage(MM.deserialize(plugin.miningConfig().message("no-permission")));
            return true;
        }
        if (args.length < 2) {
            // Ojo: en MiniMessage los <...> son etiquetas, por eso se usan corchetes.
            sender.sendMessage(MM.deserialize("<red>Uso: /mineria reset [jugador]"));
            return true;
        }
        // Primero por UUID si el servidor lo tiene cacheado; si no, por nombre guardado.
        MiningProfile profile = null;
        OfflinePlayer target = Bukkit.getOfflinePlayerIfCached(args[1]);
        if (target != null) {
            profile = plugin.storage().peek(target.getUniqueId());
        }
        if (profile == null) {
            profile = plugin.storage().findByName(args[1]);
        }
        if (profile == null) {
            sender.sendMessage(MM.deserialize(
                    "<red>No hay progreso de mineria para <player>.",
                    Placeholder.unparsed("player", args[1])));
            return true;
        }
        profile.reset();
        plugin.storage().saveQuietly();
        sender.sendMessage(MM.deserialize(
                plugin.miningConfig().message("reset-ok"),
                Placeholder.unparsed("player", args[1])));
        return true;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> options = new ArrayList<>();
        if (args.length == 1) {
            options.add("top");
            if (sender.hasPermission("zarmining.admin")) {
                options.add("reload");
                options.add("reset");
            }
            options.removeIf(option -> !option.startsWith(args[0].toLowerCase(Locale.ROOT)));
        } else if (args.length == 2 && args[0].equalsIgnoreCase("reset")
                && sender.hasPermission("zarmining.admin")) {
            for (Player online : Bukkit.getOnlinePlayers()) {
                if (online.getName().toLowerCase(Locale.ROOT).startsWith(args[1].toLowerCase(Locale.ROOT))) {
                    options.add(online.getName());
                }
            }
        }
        return options;
    }
}

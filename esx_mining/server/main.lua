local ESX = exports.es_extended:getSharedObject()

local function debugLog(msg)
    if Config.Debug then
        print(('[%s] %s'):format(Config.ResourceName, msg))
    end
end

local function discordLog(title, description, color)
    if not Config.EnableDiscordLogs then return end
    if not Config.DiscordWebhook or Config.DiscordWebhook == '' or Config.DiscordWebhook == 'PON_TU_WEBHOOK_AQUI' then
        return
    end

    local payload = {
        username = 'Mining Logs',
        embeds = {
            {
                title = title,
                description = description,
                color = color or 3447003,
                footer = { text = os.date('%d/%m/%Y %H:%M:%S') }
            }
        }
    }

    PerformHttpRequest(Config.DiscordWebhook, function() end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json'
    })
end

local function createTables()
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS mining_progress (
            identifier VARCHAR(64) NOT NULL PRIMARY KEY,
            xp INT NOT NULL DEFAULT 0,
            level INT NOT NULL DEFAULT 1,
            total_hits INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
end

local function ensureProgress(identifier)
    local row = MySQL.single.await('SELECT identifier, xp, level, total_hits FROM mining_progress WHERE identifier = ?', { identifier })

    if not row then
        MySQL.insert.await('INSERT INTO mining_progress (identifier, xp, level, total_hits) VALUES (?, 0, 1, 0)', { identifier })
        row = {
            identifier = identifier,
            xp = 0,
            level = 1,
            total_hits = 0
        }
    end

    return row
end

local function calculateLevel(xp, level)
    local newXp = xp
    local newLevel = level
    local leveledUp = false

    local needed = Config.Experience.requiredForLevel(newLevel)
    while newXp >= needed do
        newXp = newXp - needed
        newLevel = newLevel + 1
        leveledUp = true
        needed = Config.Experience.requiredForLevel(newLevel)
    end

    return newXp, newLevel, leveledUp
end

local function getIdentifier(source)
    local xPlayer = ESX.GetPlayerFromId(source)
    return xPlayer and xPlayer.identifier or nil
end

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName ~= Config.ResourceName then return end
    createTables()
    debugLog('SQL verificadas/creadas correctamente.')
end)

ESX.RegisterServerCallback('esx_mining:getProgress', function(source, cb)
    local identifier = getIdentifier(source)
    if not identifier then
        cb(nil)
        return
    end

    cb(ensureProgress(identifier))
end)

RegisterNetEvent('esx_mining:tryMine', function(pickaxeItem)
    local src = source
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return end

    local pickCfg = Config.Pickaxes[pickaxeItem]
    if not pickCfg then return end

    local count = exports.ox_inventory:Search(src, 'count', pickaxeItem)
    if (count or 0) < 1 then
        TriggerClientEvent('ox_lib:notify', src, { type = 'error', description = L('no_pickaxe') })
        return
    end

    local identifier = xPlayer.identifier
    local progress = ensureProgress(identifier)

    if progress.level < pickCfg.requiredLevel then
        TriggerClientEvent('ox_lib:notify', src, {
            type = 'error',
            description = L('level_required', pickCfg.requiredLevel)
        })
        return
    end

    if not exports.ox_inventory:CanCarryItem(src, Config.RockItem, 1) then
        TriggerClientEvent('ox_lib:notify', src, { type = 'error', description = L('inv_full') })
        return
    end

    exports.ox_inventory:AddItem(src, Config.RockItem, 1)

    local gainedXp = math.floor(Config.Experience.basePerHit * pickCfg.xpMultiplier)
    local rawXp = progress.xp + gainedXp
    local finalXp, finalLevel, didLevelUp = calculateLevel(rawXp, progress.level)

    MySQL.update.await([[
        UPDATE mining_progress
        SET xp = ?, level = ?, total_hits = total_hits + 1
        WHERE identifier = ?
    ]], { finalXp, finalLevel, identifier })

    TriggerClientEvent('ox_lib:notify', src, { type = 'success', description = L('success') })

    if didLevelUp then
        TriggerClientEvent('ox_lib:notify', src, {
            type = 'success',
            description = L('level_up', finalLevel)
        })
    end

    local xpNeeded = Config.Experience.requiredForLevel(finalLevel)
    discordLog('Minería', (
        '**Jugador:** %s\n**ID:** %s\n**Pico:** %s\n**Item:** 1x %s\n**Nivel:** %s\n**XP:** %s/%s'
    ):format(GetPlayerName(src), src, pickaxeItem, Config.RockItem, finalLevel, finalXp, xpNeeded), 5763719)
end)

lib.addCommand('mining', {
    help = L('command_help')
}, function(source)
    local identifier = getIdentifier(source)
    if not identifier then return end

    local progress = ensureProgress(identifier)
    local needed = Config.Experience.requiredForLevel(progress.level)

    TriggerClientEvent('ox_lib:notify', source, {
        type = 'inform',
        description = L('command_level_msg', progress.level, progress.xp, needed, progress.total_hits)
    })
end)

RegisterCommand('miningreset', function(source, args)
    if source == 0 then return end

    if not IsPlayerAceAllowed(source, Config.AdminAce) then
        return
    end

    local targetId = tonumber(args[1]) or source
    local xTarget = ESX.GetPlayerFromId(targetId)
    if not xTarget then return end

    MySQL.update.await('UPDATE mining_progress SET xp = 0, level = 1, total_hits = 0 WHERE identifier = ?', {
        xTarget.identifier
    })

    TriggerClientEvent('ox_lib:notify', targetId, {
        type = 'inform',
        description = L('admin_reset_ok')
    })
end, false)

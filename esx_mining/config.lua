Config = {}

Config.Locale = 'es'
Config.Debug = false

Config.ResourceName = GetCurrentResourceName()

Config.EnableDiscordLogs = true
Config.DiscordWebhook = 'PON_TU_WEBHOOK_AQUI'

-- Permisos SOLO para administración (el trabajo de minería es libre para todos)
Config.AdminAce = 'group.admin'

Config.RockItem = 'rock'

Config.Experience = {
    basePerHit = 10,
    requiredForLevel = function(level)
        return math.floor(100 + ((level - 1) * 75))
    end
}

Config.Pickaxes = {
    pickaxe_rusty = {
        label = 'Pico oxidado',
        requiredLevel = 1,
        duration = 7000,
        xpMultiplier = 1.0,
        durabilityLoss = 1,
    },
    pickaxe_iron = {
        label = 'Pico de hierro',
        requiredLevel = 3,
        duration = 5500,
        xpMultiplier = 1.15,
        durabilityLoss = 1,
    },
    pickaxe_steel = {
        label = 'Pico de acero',
        requiredLevel = 7,
        duration = 4200,
        xpMultiplier = 1.30,
        durabilityLoss = 1,
    }
}

Config.MiningNodes = {
    vec3(2951.26, 2788.77, 41.49),
    vec3(2947.37, 2794.95, 40.58),
    vec3(2939.39, 2801.42, 41.27)
}

Config.Animation = {
    dict = 'melee@large_wpn@streamed_core',
    clip = 'ground_attack_on_spot'
}

Config.PickaxeProp = {
    model = `prop_tool_pickaxe`,
    bone = 57005,
    offset = vec3(0.13, 0.00, -0.02),
    rotation = vec3(-80.0, 0.0, 0.0)
}

Config.AntiSpamCooldownMs = 800

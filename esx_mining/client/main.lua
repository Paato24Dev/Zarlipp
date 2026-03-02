local miningBusy = false
local lastMineAttempt = 0

local function notify(data)
    lib.notify(data)
end

local function getBestPickaxe()
    local bestItem, bestDuration

    for item, cfg in pairs(Config.Pickaxes) do
        local count = exports.ox_inventory:Search('count', item)
        if (count or 0) > 0 then
            if not bestDuration or cfg.duration < bestDuration then
                bestItem = item
                bestDuration = cfg.duration
            end
        end
    end

    return bestItem
end

local function attachPickaxeProp()
    lib.requestModel(Config.PickaxeProp.model, 3000)
    local ped = PlayerPedId()

    local prop = CreateObject(Config.PickaxeProp.model, 0.0, 0.0, 0.0, true, true, false)
    AttachEntityToEntity(
        prop,
        ped,
        GetPedBoneIndex(ped, Config.PickaxeProp.bone),
        Config.PickaxeProp.offset.x, Config.PickaxeProp.offset.y, Config.PickaxeProp.offset.z,
        Config.PickaxeProp.rotation.x, Config.PickaxeProp.rotation.y, Config.PickaxeProp.rotation.z,
        true, true, false, true, 1, true
    )

    return prop
end

local function mineRock()
    if miningBusy then return end

    local now = GetGameTimer()
    if now - lastMineAttempt < Config.AntiSpamCooldownMs then
        return
    end
    lastMineAttempt = now

    local pickaxe = getBestPickaxe()
    if not pickaxe then
        notify({ type = 'error', description = L('no_pickaxe') })
        return
    end

    local pickCfg = Config.Pickaxes[pickaxe]

    miningBusy = true
    lib.requestAnimDict(Config.Animation.dict, 3000)
    local prop = attachPickaxeProp()

    TaskPlayAnim(PlayerPedId(), Config.Animation.dict, Config.Animation.clip, 8.0, -8.0, -1, 1, 0, false, false, false)
    notify({ type = 'inform', description = L('started') })

    local done = lib.progressCircle({
        duration = pickCfg.duration,
        position = 'bottom',
        canCancel = true,
        disable = {
            move = true,
            combat = true,
            car = true
        }
    })

    ClearPedTasks(PlayerPedId())
    if DoesEntityExist(prop) then
        DeleteEntity(prop)
    end

    if done then
        TriggerServerEvent('esx_mining:tryMine', pickaxe)
    else
        notify({ type = 'error', description = L('cancelled') })
    end

    miningBusy = false
end

CreateThread(function()
    for i = 1, #Config.MiningNodes do
        local coords = Config.MiningNodes[i]
        exports.ox_target:addSphereZone({
            coords = coords,
            radius = 1.8,
            debug = Config.Debug,
            options = {
                {
                    name = ('esx_mining:%s:%s'):format(i, tostring(coords)),
                    icon = 'fa-solid fa-hammer',
                    label = L('target_mine'),
                    onSelect = mineRock,
                }
            }
        })
    end
end)

Locales = Locales or {}

function L(key, ...)
    local lang = Config.Locale or 'es'
    local data = Locales[lang] or Locales.es or {}
    local str = data[key] or key

    if select('#', ...) > 0 then
        return str:format(...)
    end

    return str
end

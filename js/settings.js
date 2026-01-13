// settings.js
(function(){
  const KEY_PREFIX = "remesas_";

  const KEYS = {
    profitPercent: KEY_PREFIX + "profitPercent",
    minCommission: KEY_PREFIX + "minCommission",
    minThreshold: KEY_PREFIX + "minThreshold",

    rateMode: KEY_PREFIX + "rateMode",          // "auto" | "manual"
    rateSource: KEY_PREFIX + "rateSource",      // "oficial" | "alt"
    manualRate: KEY_PREFIX + "manualRate",

    rateOficial: KEY_PREFIX + "rateOficial",
    rateAlt: KEY_PREFIX + "rateAlt",

    updatedOficial: KEY_PREFIX + "updatedOficial",
    updatedAlt: KEY_PREFIX + "updatedAlt",
  };

  const DEFAULTS = {
    profitPercent: 7,
    minCommission: 4,
    minThreshold: 40,

    rateMode: "auto",
    rateSource: "oficial",

    manualRate: 0,

    rateOficial: 0,
    rateAlt: 0,

    updatedOficial: "",
    updatedAlt: "",
  };

  function n(v, fallback=0){
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  }

  function s(v, fallback=""){
    return (typeof v === "string" && v.length) ? v : fallback;
  }

  function computeEffective(next){
    let exchangeRate = 0;
    let lastRateUpdatedAt = "";

    if (next.rateMode === "manual") {
      exchangeRate = n(next.manualRate, 0);
      lastRateUpdatedAt = ""; // manual no depende de API
    } else {
      const src = next.rateSource === "alt" ? "alt" : "oficial";
      if (src === "alt") {
        exchangeRate = n(next.rateAlt, 0);
        lastRateUpdatedAt = s(next.updatedAlt, "");
      } else {
        exchangeRate = n(next.rateOficial, 0);
        lastRateUpdatedAt = s(next.updatedOficial, "");
      }
    }

    return { ...next, exchangeRate, lastRateUpdatedAt };
  }

  function getSettings(){
    const next = {
      profitPercent: n(localStorage.getItem(KEYS.profitPercent), DEFAULTS.profitPercent),
      minCommission: n(localStorage.getItem(KEYS.minCommission), DEFAULTS.minCommission),
      minThreshold: n(localStorage.getItem(KEYS.minThreshold), DEFAULTS.minThreshold),

      rateMode: s(localStorage.getItem(KEYS.rateMode), DEFAULTS.rateMode),
      rateSource: s(localStorage.getItem(KEYS.rateSource), DEFAULTS.rateSource),

      manualRate: n(localStorage.getItem(KEYS.manualRate), DEFAULTS.manualRate),

      rateOficial: n(localStorage.getItem(KEYS.rateOficial), DEFAULTS.rateOficial),
      rateAlt: n(localStorage.getItem(KEYS.rateAlt), DEFAULTS.rateAlt),

      updatedOficial: s(localStorage.getItem(KEYS.updatedOficial), DEFAULTS.updatedOficial),
      updatedAlt: s(localStorage.getItem(KEYS.updatedAlt), DEFAULTS.updatedAlt),
    };

    // normaliza
    next.rateMode = (next.rateMode === "manual") ? "manual" : "auto";
    next.rateSource = (next.rateSource === "alt") ? "alt" : "oficial";

    // ✅ AUTO-REPARACIÓN: si quedaron los 3 valores en 0 (caso típico por guardar vacío),
    // volvemos a defaults (7%, $4, $40)
    const allZero =
      (Number(next.profitPercent) === 0) &&
      (Number(next.minCommission) === 0) &&
      (Number(next.minThreshold) === 0);

    if (allZero) {
      next.profitPercent = DEFAULTS.profitPercent;
      next.minCommission = DEFAULTS.minCommission;
      next.minThreshold = DEFAULTS.minThreshold;

      // ✅ Persistir para que no vuelva a aparecer en 0 al recargar
      localStorage.setItem(KEYS.profitPercent, String(next.profitPercent));
      localStorage.setItem(KEYS.minCommission, String(next.minCommission));
      localStorage.setItem(KEYS.minThreshold, String(next.minThreshold));
    }

    return computeEffective(next);
  }


  function setSettings(partial){
    const current = getSettings();
    const next = { ...current, ...partial };

    // normaliza
    next.rateMode = (next.rateMode === "manual") ? "manual" : "auto";
    next.rateSource = (next.rateSource === "alt") ? "alt" : "oficial";

    // persiste
    localStorage.setItem(KEYS.profitPercent, String(n(next.profitPercent, DEFAULTS.profitPercent)));
    localStorage.setItem(KEYS.minCommission, String(n(next.minCommission, DEFAULTS.minCommission)));
    localStorage.setItem(KEYS.minThreshold, String(n(next.minThreshold, DEFAULTS.minThreshold)));

    localStorage.setItem(KEYS.rateMode, next.rateMode);
    localStorage.setItem(KEYS.rateSource, next.rateSource);

    localStorage.setItem(KEYS.manualRate, String(n(next.manualRate, 0)));

    localStorage.setItem(KEYS.rateOficial, String(n(next.rateOficial, 0)));
    localStorage.setItem(KEYS.rateAlt, String(n(next.rateAlt, 0)));

    if (next.updatedOficial) localStorage.setItem(KEYS.updatedOficial, String(next.updatedOficial));
    if (next.updatedAlt) localStorage.setItem(KEYS.updatedAlt, String(next.updatedAlt));

    return getSettings();
  }

  function resetSettings(){
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  window.AppSettings = { DEFAULTS, KEYS, getSettings, setSettings, resetSettings };
})();

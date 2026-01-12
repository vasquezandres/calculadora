// settings.js
(function(){
  const DEFAULTS = {
    profitPercent: 7,
    minCommission: 4,
    minThreshold: 40,
    rateMode: "auto",   // auto | manual
    manualRate: 0,
    lastRateUpdatedAt: ""
  };

  const KEYS = {
    profitPercent: "remesa_profitPercent",
    minCommission: "remesa_minCommission",
    minThreshold: "remesa_minThreshold",
    rateMode: "remesa_rateMode",
    manualRate: "remesa_manualRate",
    lastRateUpdatedAt: "remesa_lastRateUpdatedAt",
    exchangeRate: "exchangeRate" // keep original key for compatibility
  };

  function readNumber(key, fallback){
    const v = localStorage.getItem(key);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function readString(key, fallback){
    const v = localStorage.getItem(key);
    return (v === null || v === "") ? fallback : String(v);
  }

  function getSettings(){
    return {
      profitPercent: readNumber(KEYS.profitPercent, DEFAULTS.profitPercent),
      minCommission: readNumber(KEYS.minCommission, DEFAULTS.minCommission),
      minThreshold: readNumber(KEYS.minThreshold, DEFAULTS.minThreshold),
      rateMode: readString(KEYS.rateMode, DEFAULTS.rateMode),
      manualRate: readNumber(KEYS.manualRate, DEFAULTS.manualRate),
      lastRateUpdatedAt: readString(KEYS.lastRateUpdatedAt, DEFAULTS.lastRateUpdatedAt),
      exchangeRate: readNumber(KEYS.exchangeRate, 0)
    };
  }

  function setSettings(partial){
    const current = getSettings();
    const next = { ...current, ...partial };

    localStorage.setItem(KEYS.profitPercent, String(next.profitPercent));
    localStorage.setItem(KEYS.minCommission, String(next.minCommission));
    localStorage.setItem(KEYS.minThreshold, String(next.minThreshold));
    localStorage.setItem(KEYS.rateMode, String(next.rateMode));
    localStorage.setItem(KEYS.manualRate, String(next.manualRate));
    localStorage.setItem(KEYS.lastRateUpdatedAt, String(next.lastRateUpdatedAt));

    // keep original exchangeRate key
    if (Number.isFinite(Number(next.exchangeRate))) {
      localStorage.setItem(KEYS.exchangeRate, String(next.exchangeRate));
    }
    return next;
  }

  function resetSettings(){
    // Remove keys so defaults take effect
    Object.values(KEYS).forEach(k => {
      // do not remove exchangeRate automatically? we'll remove it too for a clean reset
      localStorage.removeItem(k);
    });
  }

  window.AppSettings = { DEFAULTS, KEYS, getSettings, setSettings, resetSettings };
})();

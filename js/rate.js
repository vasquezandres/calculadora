// rate.js
(function(){
  const API_URL = "https://remesas.solutechcloud.com/api/dolar/oficial"; // BCV official USD->VES

  function setRateUI({ exchangeRate, rateMode, lastRateUpdatedAt }){
    const rateEl = document.getElementById("bcvRate");
    const badge = document.getElementById("rateModeBadge");
    const meta = document.getElementById("rateMeta");

    if (rateEl) rateEl.textContent = `Bs. ${Utils.formatNumber(exchangeRate)}`;
    if (badge) badge.textContent = (rateMode === "manual") ? "MANUAL" : "AUTO";

    if (meta){
      if (rateMode === "manual"){
        meta.textContent = "Usando tasa personalizada guardada.";
      } else {
        meta.textContent = lastRateUpdatedAt ? `  ${formatPrettyDate(lastRateUpdatedAt)}` : "Sin actualización reciente (usando valor guardado).";
      }
    }
  }

  function formatPrettyDate(iso){
    try{
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('es-PA', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    }catch{
      return iso;
    }
  }

  async function fetchExchangeRate(force=false){
    const s = AppSettings.getSettings();
    if (s.rateMode !== "auto"){
      // In manual mode we don't fetch, just update UI
      setRateUI(s);
      return s.exchangeRate;
    }

    // If we have a stored rate and not forcing, use it
    if (!force && s.exchangeRate > 0){
      setRateUI(s);
      return s.exchangeRate;
    }

    try{
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // DolarAPI returns {moneda, casa, nombre, compra, venta, fechaActualizacion, ...}
      const rate = Number(data?.promedio ?? data?.venta ?? data?.compra);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error("Tasa inválida");
      const updatedAt = data?.fechaActualizacion ? String(data.fechaActualizacion) : Utils.nowISO();

      const next = AppSettings.setSettings({ exchangeRate: rate, lastRateUpdatedAt: updatedAt });
      setRateUI(next);
      return rate;
    } catch (e){
      // fallback to stored
      const fallback = AppSettings.getSettings();
      setRateUI(fallback);
      return fallback.exchangeRate || 0;
    }
  }

  window.Rate = { fetchExchangeRate, setRateUI };
})();

// rate.js
<<<<<<< HEAD
(function () {
  // Si estás en localhost, pega al dominio real.
  // Si estás ya en remesas.solutechcloud.com, usa relativo.
  const API_BASE = (location.hostname === "localhost")
    ? "https://remesas.solutechcloud.com"
    : "";
=======
(function(){
  const API_URL = "https://remesas.solutechcloud.com/api/dolar/oficial"; // BCV official USD->VES
>>>>>>> 178a752c8f340890d72d675480e35102d1c9370f

  const API = {
    oficial: `${API_BASE}/api/dolar/oficial`,
    alt: `${API_BASE}/api/dolar/alt`,
  };

  const TTL_MS = 3 * 60 * 60 * 1000; // 3 horas (ajusta si quieres)

  const inflight = { oficial: null, alt: null };

  function nowMs(){ return Date.now(); }

  function parseRate(data){
    const rate = Number(data?.promedio ?? data?.venta ?? data?.compra);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Tasa inválida");
    return rate;
  }

  function formatPrettyDate(iso){
    try{
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('es-PA', {
        year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit'
      });
    }catch{
      return iso;
    }
  }

  function setRateUI(s){
    const rateEl = document.getElementById("bcvRate");
    const badge = document.getElementById("rateModeBadge");
    const meta = document.getElementById("rateMeta");

    if (rateEl) rateEl.textContent = `Bs. ${Utils.formatNumber(s.exchangeRate || 0)}`;
    if (badge) badge.textContent = (s.rateMode === "manual") ? "MANUAL" : "AUTO";

    if (!meta) return;

    if (s.rateMode === "manual"){
      meta.textContent = "Otra • usando tasa personalizada.";
      return;
    }

    const label = (s.rateSource === "alt") ? "Alterna" : "BCV";
    meta.textContent = s.lastRateUpdatedAt
      ? `${label} • ${formatPrettyDate(s.lastRateUpdatedAt)}`
      : `${label} • Sin actualización reciente (usando valor guardado).`;
  }

  function isFresh(updatedIso){
    if (!updatedIso) return false;
    const t = new Date(updatedIso).getTime();
    if (!Number.isFinite(t)) return false;
    return (nowMs() - t) < TTL_MS;
  }

  async function fetchOne(source, force=false){
    const s = AppSettings.getSettings();

    // si está en manual, no buscamos API
    if (s.rateMode === "manual") {
      setRateUI(s);
      return s.exchangeRate || 0;
    }

    const src = (source === "alt") ? "alt" : "oficial";

    // si no forzamos y tenemos fresca, usamos guardada
    if (!force) {
      if (src === "alt" && s.rateAlt > 0 && isFresh(s.updatedAlt)) return s.rateAlt;
      if (src === "oficial" && s.rateOficial > 0 && isFresh(s.updatedOficial)) return s.rateOficial;
    }

    const url = API[src] + `?t=${nowMs()}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const rate = parseRate(data);
    const updatedAt = String(data?.fechaActualizacion || new Date().toISOString());

    if (src === "alt") {
      AppSettings.setSettings({ rateAlt: rate, updatedAlt: updatedAt });
    } else {
      AppSettings.setSettings({ rateOficial: rate, updatedOficial: updatedAt });
    }

    return rate;
  }

  async function fetchExchangeRate(source="oficial", force=false){
    const src = (source === "alt") ? "alt" : "oficial";

    // single-flight por fuente
    if (inflight[src]) return inflight[src];

    inflight[src] = (async () => {
      try {
        const rate = await fetchOne(src, force);

        // actualiza UI con lo que esté seleccionado actualmente
        const s2 = AppSettings.getSettings();
        setRateUI(s2);
        return rate;
      } catch (e) {
        // fallback a lo guardado
        const fallback = AppSettings.getSettings();
        setRateUI(fallback);
        return fallback.exchangeRate || 0;
      } finally {
        inflight[src] = null;
      }
    })();

    return inflight[src];
  }

  window.Rate = { fetchExchangeRate, setRateUI };
})();


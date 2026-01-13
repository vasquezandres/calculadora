// app.js
(function () {
  function switchTab(tabId) {
    document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));

    document.querySelector(`.tab-button[data-tab="${tabId}"]`)?.classList.add("active");
    document.getElementById(tabId)?.classList.add("active");
  }

  function setMode(mode) {
    const sendBtn = document.getElementById("send-mode");
    const recvBtn = document.getElementById("receive-mode");
    const sendInput = document.getElementById("sendAmount");
    const recvInput = document.getElementById("receiveAmount");
    const label = document.getElementById("remesaLabel");

    if (mode === "send") {
      sendBtn?.classList.add("active");
      recvBtn?.classList.remove("active");
      sendInput?.classList.remove("hidden");
      recvInput?.classList.add("hidden");
      if (label) label.textContent = "Monto a enviar (USD)";
      Calc.calculateSendAmount();
    } else {
      recvBtn?.classList.add("active");
      sendBtn?.classList.remove("active");
      recvInput?.classList.remove("hidden");
      sendInput?.classList.add("hidden");
      if (label) label.textContent = "Monto a recibir (USD)";
      Calc.calculateReceiveAmount();
    }
  }

  function syncQuickRateUI() {
    const s = AppSettings.getSettings();
    const qInput = document.getElementById("quickCustomRate");
    const qWrap = document.querySelector(".quick-manual");
    if (qInput) qInput.value = String(s.manualRate || 0);
    if (qWrap) qWrap.style.display = s.rateMode === "manual" ? "flex" : "none";
  }

  function populateSettingsUI() {
    const s = AppSettings.getSettings();

    const profitPercent = document.getElementById("profitPercent");
    const minCommission = document.getElementById("minCommission");
    const minThreshold = document.getElementById("minThreshold");
    const rateModeEl = document.getElementById("rateMode");
    const manualRateEl = document.getElementById("manualRate");
    const rateSourceEl = document.getElementById("rateSource");

    if (profitPercent) profitPercent.value = String(s.profitPercent);
    if (minCommission) minCommission.value = String(s.minCommission);
    if (minThreshold) minThreshold.value = String(s.minThreshold);

    if (rateModeEl) rateModeEl.value = s.rateMode;
    if (rateSourceEl) rateSourceEl.value = s.rateSource || "oficial";
    if (manualRateEl) manualRateEl.value = String(s.manualRate || 0);

    // UI enable/disable
    if (manualRateEl) {
      manualRateEl.disabled = s.rateMode !== "manual";
      manualRateEl.style.opacity = s.rateMode !== "manual" ? ".55" : "1";
    }
    if (rateSourceEl) {
      rateSourceEl.disabled = s.rateMode === "manual";
      rateSourceEl.style.opacity = s.rateMode === "manual" ? ".55" : "1";
    }

    Rate.setRateUI(s);
    syncQuickRateUI();
    updateRateButtons();
  }

  // ✅ SIEMPRE usa la fuente correcta cuando estás en AUTO
  async function refreshAutoRate(force = false) {
    const s = AppSettings.getSettings();
    const source = (s.rateSource === "alt") ? "alt" : "oficial";

    try {
      await Rate.fetchExchangeRate(source, force);
    } catch (_) {
      // Si falla, Rate ya debería hacer fallback; igual no dejamos que esto “rompa” UI
    }

    Rate.setRateUI(AppSettings.getSettings());
    syncQuickRateUI();
    updateRateButtons();
    Calc.updateAllCalculations();
  }

  function saveSettingsFromUI() {
    const profitPercent = Number(document.getElementById("profitPercent")?.value);
    const minCommission = Number(document.getElementById("minCommission")?.value);
    const minThreshold = Number(document.getElementById("minThreshold")?.value);

    const rateModeRaw = String(document.getElementById("rateMode")?.value || "auto"); // auto | manual
    const manualRate = Number(document.getElementById("manualRate")?.value);

    // fuente para AUTO (BCV u Alterna)
    const rateSourceRaw = String(document.getElementById("rateSource")?.value || "oficial"); // oficial | alt

    const rateMode = (rateModeRaw === "manual") ? "manual" : "auto";
    const rateSource = (rateSourceRaw === "alt") ? "alt" : "oficial";

    const partial = {
      profitPercent: Number.isFinite(profitPercent) ? profitPercent : AppSettings.DEFAULTS.profitPercent,
      minCommission: Number.isFinite(minCommission) ? minCommission : AppSettings.DEFAULTS.minCommission,
      minThreshold: Number.isFinite(minThreshold) ? minThreshold : AppSettings.DEFAULTS.minThreshold,
      rateMode,
      manualRate: Number.isFinite(manualRate) ? manualRate : 0,
      rateSource,
    };

    const next = AppSettings.setSettings(partial);

    // MANUAL ("Otra"): usar manualRate inmediatamente
    if (next.rateMode === "manual") {
      const mr = Number(next.manualRate) || 0;
      AppSettings.setSettings({ exchangeRate: mr, lastRateUpdatedAt: Utils.nowISO() });
      Rate.setRateUI(AppSettings.getSettings());
      syncQuickRateUI();
      updateRateButtons();
      Calc.updateAllCalculations();
      return;
    }

    // AUTO: refrescar desde la fuente seleccionada (forzar)
    refreshAutoRate(true);
  }

  function resetSettings() {
    AppSettings.resetSettings();
    populateSettingsUI();
    refreshAutoRate(true);
  }

  function updateRateButtons() {
    const s = AppSettings.getSettings();

    // OJO: tu UI ahora es BCV / Alterna / Otra (no btnModeAuto)
    document.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));

    if (s.rateMode === "manual") {
      document.getElementById("btnModeCustom")?.classList.add("active");
      return;
    }

    if (s.rateSource === "alt") {
      document.getElementById("btnModeAlt")?.classList.add("active");
    } else {
      document.getElementById("btnModeAuto")?.classList.add("active");
    }
  }

  function wireEvents() {
    // tabs
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // modes
    document.getElementById("send-mode")?.addEventListener("click", () => setMode("send"));
    document.getElementById("receive-mode")?.addEventListener("click", () => setMode("receive"));

    // inputs
    document.getElementById("sendAmount")?.addEventListener("input", Calc.calculateSendAmount);
    document.getElementById("receiveAmount")?.addEventListener("input", Calc.calculateReceiveAmount);

    document.getElementById("usdAmount")?.addEventListener("input", Calc.convertUSDToVES);
    document.getElementById("vesAmount")?.addEventListener("input", Calc.convertVESToUSD);

    // ✅ BCV
    document.getElementById("btnModeAuto")?.addEventListener("click", () => {
      AppSettings.setSettings({ rateMode: "auto", rateSource: "oficial" });
      populateSettingsUI();
      refreshAutoRate(false);
    });

    // ✅ Alterna
    document.getElementById("btnModeAlt")?.addEventListener("click", () => {
      AppSettings.setSettings({ rateMode: "auto", rateSource: "alt" });
      populateSettingsUI();
      refreshAutoRate(false);
    });

    // ✅ Otra (Manual)
    document.getElementById("btnModeCustom")?.addEventListener("click", () => {
      AppSettings.setSettings({ rateMode: "manual" });
      populateSettingsUI();

      const s = AppSettings.getSettings();
      const mr = Number(s.manualRate) || 0;
      AppSettings.setSettings({ exchangeRate: mr, lastRateUpdatedAt: Utils.nowISO() });

      Rate.setRateUI(AppSettings.getSettings());
      syncQuickRateUI();
      updateRateButtons();
      Calc.updateAllCalculations();
    });

    // aplicar manual desde el header
    document.getElementById("btnApplyCustomRate")?.addEventListener("click", () => {
      const v = Number(document.getElementById("quickCustomRate")?.value);
      const customRate = Number.isFinite(v) ? v : 0;

      AppSettings.setSettings({
        rateMode: "manual",
        manualRate: customRate,
        exchangeRate: customRate,
        lastRateUpdatedAt: Utils.nowISO(),
      });

      // sync settings panel
      const panelManual = document.getElementById("manualRate");
      const panelMode = document.getElementById("rateMode");
      if (panelManual) panelManual.value = String(customRate);
      if (panelMode) panelMode.value = "manual";

      Rate.setRateUI(AppSettings.getSettings());
      syncQuickRateUI();
      updateRateButtons();
      Calc.updateAllCalculations();
    });

    // rate refresh
    document.getElementById("btnRefreshRate")?.addEventListener("click", () => {
      const s = AppSettings.getSettings();
      if (s.rateMode === "manual") {
        const mr = Number(s.manualRate) || 0;
        AppSettings.setSettings({ exchangeRate: mr, lastRateUpdatedAt: Utils.nowISO() });
        Rate.setRateUI(AppSettings.getSettings());
        syncQuickRateUI();
        updateRateButtons();
        Calc.updateAllCalculations();
      } else {
        refreshAutoRate(true);
      }
    });

    // settings actions
    document.getElementById("btnSaveSettings")?.addEventListener("click", saveSettingsFromUI);
    document.getElementById("btnResetSettings")?.addEventListener("click", resetSettings);

    // if rate mode changes, enable/disable manual input visually
    document.getElementById("rateMode")?.addEventListener("change", () => {
      const mode = document.getElementById("rateMode")?.value || "auto";
      const manualRate = document.getElementById("manualRate");
      const rateSource = document.getElementById("rateSource");

      if (manualRate) {
        manualRate.disabled = mode !== "manual";
        manualRate.style.opacity = mode !== "manual" ? ".55" : "1";
      }

      if (rateSource) {
        rateSource.disabled = mode === "manual";
        rateSource.style.opacity = mode === "manual" ? ".55" : "1";
      }
    });

    // cambio de fuente en settings (no fuerza fetch hasta Guardar)
    document.getElementById("rateSource")?.addEventListener("change", () => {
      // NO llames populateSettingsUI() aquí porque pisa el select con lo guardado.
      // Solo se refleja al guardar.
    });
  }

  async function init() {
    populateSettingsUI();
    wireEvents();

    // asegurar disabled/enabled correcto
    const rm = document.getElementById("rateMode");
    if (rm) rm.dispatchEvent(new Event("change"));

    // ✅ precargar ambas tasas sin tumbar la app si una falla
    await Promise.allSettled([
      Rate.fetchExchangeRate("oficial", false),
      Rate.fetchExchangeRate("alt", false),
    ]);

    setMode("send");
    Calc.updateAllCalculations();
  }

  document.addEventListener("DOMContentLoaded", init);
})();


// -------------------- PWA / Install (bloque único, sin duplicados) --------------------

// Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Install button logic
let deferredPrompt = null;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// Preparar botón al cargar
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnInstall");
  if (!btn) return;

  // Si está corriendo como app, ocultar
  if (isAppInstalled()) {
    btn.style.display = "none";
    return;
  }

  if (isIOS) {
    btn.style.display = "inline-flex";
    btn.addEventListener("click", () => {
      alert(
        "Para instalar:\n\n" +
          "1. Abre este sitio en Safari\n" +
          "2. Pulsa Compartir (⬆️)\n" +
          "3. Toca «Agregar a pantalla de inicio»"
      );
    });
  } else {
    btn.style.display = "none";
  }
});

// Android/Desktop: capturar evento y mostrar botón
window.addEventListener("beforeinstallprompt", (e) => {
  if (isIOS) return;
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById("btnInstall");
  if (btn) btn.style.display = "inline-flex";
});

// Al instalar, ocultar
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  const btn = document.getElementById("btnInstall");
  if (btn) btn.style.display = "none";
});

// Función global para onclick="installPWA()"
window.installPWA = async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
};

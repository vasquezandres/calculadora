// app.js
(function(){
  function switchTab(tabId){
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    document.querySelector(`.tab-button[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');
  }

  function setMode(mode){
    const sendBtn = document.getElementById('send-mode');
    const recvBtn = document.getElementById('receive-mode');
    const sendInput = document.getElementById('sendAmount');
    const recvInput = document.getElementById('receiveAmount');
    const label = document.getElementById('remesaLabel');

    if (mode === 'send'){
      sendBtn?.classList.add('active');
      recvBtn?.classList.remove('active');
      sendInput?.classList.remove('hidden');
      recvInput?.classList.add('hidden');
      if (label) label.textContent = "Monto a enviar (USD)";
      Calc.calculateSendAmount();
    } else {
      recvBtn?.classList.add('active');
      sendBtn?.classList.remove('active');
      recvInput?.classList.remove('hidden');
      sendInput?.classList.add('hidden');
      if (label) label.textContent = "Monto a recibir (USD)";
      Calc.calculateReceiveAmount();
    }
  }

  function syncQuickRateUI(){
    const s = AppSettings.getSettings();
    const bAuto = document.getElementById('btnModeAuto');
    const bCustom = document.getElementById('btnModeCustom');
    const qInput = document.getElementById('quickCustomRate');
    const qWrap = document.querySelector('.quick-manual');
    if (bAuto && bCustom){
      bAuto.classList.toggle('active', s.rateMode !== 'manual');
      bCustom.classList.toggle('active', s.rateMode === 'manual');
    }
    if (qInput) qInput.value = String(s.manualRate || 0);
    if (qWrap){
      qWrap.style.display = (s.rateMode === 'manual') ? 'flex' : 'none';
    }
  }

  function populateSettingsUI(){
    const s = AppSettings.getSettings();

    const profitPercent = document.getElementById("profitPercent");
    const minCommission = document.getElementById("minCommission");
    const minThreshold = document.getElementById("minThreshold");
    const rateMode = document.getElementById("rateMode");
    const manualRate = document.getElementById("manualRate");

    if (profitPercent) profitPercent.value = String(s.profitPercent);
    if (minCommission) minCommission.value = String(s.minCommission);
    if (minThreshold) minThreshold.value = String(s.minThreshold);
    if (rateMode) rateMode.value = s.rateMode;
    if (manualRate) manualRate.value = String(s.manualRate);

    // For manual mode, store the manualRate into exchangeRate
    if (s.rateMode === "manual"){
      const effective = Number(s.manualRate) || 0;
      AppSettings.setSettings({ exchangeRate: effective });
    }

    Rate.setRateUI(AppSettings.getSettings());
    syncQuickRateUI();
  }

  function saveSettingsFromUI(){
    const profitPercent = Number(document.getElementById("profitPercent")?.value);
    const minCommission = Number(document.getElementById("minCommission")?.value);
    const minThreshold = Number(document.getElementById("minThreshold")?.value);
    const rateMode = String(document.getElementById("rateMode")?.value || "auto");
    const manualRate = Number(document.getElementById("manualRate")?.value);

    const partial = {
      profitPercent: Number.isFinite(profitPercent) ? profitPercent : AppSettings.DEFAULTS.profitPercent,
      minCommission: Number.isFinite(minCommission) ? minCommission : AppSettings.DEFAULTS.minCommission,
      minThreshold: Number.isFinite(minThreshold) ? minThreshold : AppSettings.DEFAULTS.minThreshold,
      rateMode: (rateMode === "manual") ? "manual" : "auto",
      manualRate: Number.isFinite(manualRate) ? manualRate : 0
    };

    const next = AppSettings.setSettings(partial);

    // If manual, immediately use manualRate as exchangeRate
    if (next.rateMode === "manual"){
      AppSettings.setSettings({ exchangeRate: Number(next.manualRate) || 0 });
      Rate.setRateUI(AppSettings.getSettings());
    syncQuickRateUI();
      Calc.updateAllCalculations();
      return;
    }

    // If auto, fetch once (force) to refresh and store
    Rate.fetchExchangeRate(true).then(() => Calc.updateAllCalculations());
  }

  function resetSettings(){
    AppSettings.resetSettings();
    populateSettingsUI();
    // auto refresh
    Rate.fetchExchangeRate(true).then(() => Calc.updateAllCalculations());
  }

  function wireEvents(){
    // tabs
    document.querySelectorAll(".tab-button").forEach(btn => {
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

    // quick rate controls (header)
    document.getElementById("btnModeAuto")?.addEventListener("click", () => {
      // switch to AUTO (BCV)
      AppSettings.setSettings({ rateMode: "auto" });
      populateSettingsUI();
      Rate.fetchExchangeRate(true).then(() => Calc.updateAllCalculations());
    });

    document.getElementById("btnModeCustom")?.addEventListener("click", () => {
      // switch to CUSTOM (tasa personalizada)
      AppSettings.setSettings({ rateMode: "manual" });
      populateSettingsUI();
      // apply current custom value immediately
      const s = AppSettings.getSettings();
      AppSettings.setSettings({ exchangeRate: Number(s.manualRate) || 0 });
      Rate.setRateUI(AppSettings.getSettings());
      Calc.updateAllCalculations();
    });

    document.getElementById("btnApplyCustomRate")?.addEventListener("click", () => {
      const v = Number(document.getElementById("quickCustomRate")?.value);
      const customRate = Number.isFinite(v) ? v : 0;
      AppSettings.setSettings({ rateMode: "manual", manualRate: customRate, exchangeRate: customRate });
      // sync settings panel
      const panelManual = document.getElementById("manualRate");
      const panelMode = document.getElementById("rateMode");
      if (panelManual) panelManual.value = String(customRate);
      if (panelMode) panelMode.value = "manual";
      Rate.setRateUI(AppSettings.getSettings());
      syncQuickRateUI();
      Calc.updateAllCalculations();
    });


    // rate refresh
    document.getElementById("btnRefreshRate")?.addEventListener("click", () => {
      const s = AppSettings.getSettings();
      if (s.rateMode === "manual"){
        // just refresh UI + calculations
        AppSettings.setSettings({ exchangeRate: Number(s.manualRate) || 0 });
        Rate.setRateUI(AppSettings.getSettings());
    syncQuickRateUI();
        Calc.updateAllCalculations();
      } else {
        Rate.fetchExchangeRate(true).then(() => Calc.updateAllCalculations());
      }
    });

    // settings actions
    document.getElementById("btnSaveSettings")?.addEventListener("click", saveSettingsFromUI);
    document.getElementById("btnResetSettings")?.addEventListener("click", resetSettings);

    // if rate mode changes, enable/disable manual input visually
    document.getElementById("rateMode")?.addEventListener("change", () => {
      const mode = document.getElementById("rateMode").value;
      const manualRate = document.getElementById("manualRate");
      if (!manualRate) return;
      manualRate.disabled = (mode !== "manual");
      manualRate.style.opacity = (mode !== "manual") ? ".55" : "1";
    });
  }

  async function init(){
    populateSettingsUI();
    wireEvents();

    // Make sure manual input disabled correctly on load
    const rm = document.getElementById("rateMode");
    if (rm){
      rm.dispatchEvent(new Event("change"));
    }

    // Load initial rate (auto fetch if needed)
    await Rate.fetchExchangeRate(false);

    // Default mode is send
    setMode("send");

    // Initial conversions
    Calc.updateAllCalculations();
  }

  document.addEventListener("DOMContentLoaded", init);
})();


// Registro del Service Worker (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {});
  });
}


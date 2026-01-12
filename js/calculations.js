// calculations.js
(function(){
  function getCommission(amountUSD){
    const s = AppSettings.getSettings();
    const amount = Number(amountUSD) || 0;

    const pct = Math.max(0, Number(s.profitPercent) || 0) / 100;
    const minFee = Math.max(0, Number(s.minCommission) || 0);
    const threshold = Math.max(0, Number(s.minThreshold) || 0);

    // Original behavior preserved (amount < threshold => fixed minFee)
    if (amount < threshold){
      return minFee;
    }

    const byPct = amount * pct;
    // Also enforce minimum fee if percentage is lower
    return Math.max(byPct, minFee);
  }

  function calculateSendAmount(){
    const sendAmount = parseFloat(document.getElementById('sendAmount')?.value) || 0;

    const commission = getCommission(sendAmount);
    const totalToPay = sendAmount + commission;

    document.getElementById('commission').innerText = `$${Utils.formatNumber(commission)}`;
    document.getElementById('totalToPay').innerText = `$${Utils.formatNumber(totalToPay)}`;
    document.getElementById('receivedAmount').innerText = `$${Utils.formatNumber(sendAmount)}`;
  }

  function calculateReceiveAmount(){
    const receiveAmount = parseFloat(document.getElementById('receiveAmount')?.value) || 0;

    const commission = getCommission(receiveAmount);
    const totalToPay = receiveAmount + commission;

    document.getElementById('commission').innerText = `$${Utils.formatNumber(commission)}`;
    document.getElementById('totalToPay').innerText = `$${Utils.formatNumber(totalToPay)}`;
    document.getElementById('receivedAmount').innerText = `$${Utils.formatNumber(receiveAmount)}`;
  }

  function convertUSDToVES(){
    const usd = parseFloat(document.getElementById('usdAmount')?.value) || 0;
    const { exchangeRate } = AppSettings.getSettings();
    const result = usd * (Number(exchangeRate) || 0);
    document.getElementById('vesResult').innerText = `Bs. ${Utils.formatNumber(result)}`;
  }

  function convertVESToUSD(){
    const ves = parseFloat(document.getElementById('vesAmount')?.value) || 0;
    const { exchangeRate } = AppSettings.getSettings();
    const rate = Number(exchangeRate) || 0;
    const result = rate > 0 ? (ves / rate) : 0;
    document.getElementById('usdResult').innerText = `$${Utils.formatNumber(result)}`;
  }

  // Used by refresh + settings save
  function updateAllCalculations(){
    const sendVisible = !document.getElementById("sendAmount")?.classList.contains("hidden");
    if (sendVisible) calculateSendAmount(); else calculateReceiveAmount();
    convertUSDToVES();
    convertVESToUSD();
  }

  window.Calc = {
    getCommission,
    calculateSendAmount,
    calculateReceiveAmount,
    convertUSDToVES,
    convertVESToUSD,
    updateAllCalculations
  };
})();

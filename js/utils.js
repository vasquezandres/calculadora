// utils.js
(function(){
  window.Utils = {
    formatNumber(n){
      return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    nowISO(){
      return new Date().toISOString();
    }
  };
})();

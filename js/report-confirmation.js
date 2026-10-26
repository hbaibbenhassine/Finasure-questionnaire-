(function () {
  "use strict";
  const state = window.FinasureStorage.load();
  const localizedUrl = (url) => window.FinasureI18n?.localizedUrl(url) || url;
  if (!state.personalizedReportRequested) {
    location.replace(localizedUrl("rapport-complet.html"));
    return;
  }

  let seconds = 15;
  const countdown = document.querySelector("#redirect-countdown");
  const redirectNotice = document.querySelector("#automatic-redirect");
  const timer = window.setInterval(() => {
    seconds -= 1;
    countdown.textContent = String(seconds);
    if (seconds <= 0) {
      window.clearInterval(timer);
      location.href = localizedUrl("rendez-vous.html");
    }
  }, 1000);

  document.querySelector("#cancel-redirect").addEventListener("click", () => {
    window.clearInterval(timer);
    redirectNotice.hidden = true;
    document.querySelector("#cancel-redirect").hidden = true;
  });
})();

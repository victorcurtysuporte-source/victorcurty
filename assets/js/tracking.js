/* Google Analytics 4 — carregado apenas após consentimento (LGPD) */
(function () {
  var GA4_ID = "G-5DHP2KKGCJ";
  var STORAGE_KEY = "vc-consent"; // "granted" | "denied"

  var store = {
    get: function () {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        return null;
      }
    },
    set: function (v) {
      try {
        localStorage.setItem(STORAGE_KEY, v);
      } catch (e) {}
    },
  };

  function loadGA() {
    if (window.gtag) return;
    var ga = document.createElement("script");
    ga.async = true;
    ga.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(ga);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
  }

  function decide(choice) {
    store.set(choice);
    if (choice === "granted") loadGA();
  }

  function showBanner() {
    if (document.querySelector(".consent")) return; // já aberto

    var banner = document.createElement("div");
    banner.className = "consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Aviso de cookies");
    banner.innerHTML =
      '<p class="consent__text">Usamos cookies do Google Analytics para entender como o site é usado e melhorá-lo. Veja a <a href="/privacidade/">Política de Privacidade</a>.</p>' +
      '<div class="consent__actions">' +
      '<button type="button" class="btn btn--ghost consent__btn" data-consent="denied">Recusar</button>' +
      '<button type="button" class="btn consent__btn" data-consent="granted">Aceitar</button>' +
      "</div>";

    var dismiss = function (choice) {
      decide(choice);
      banner.classList.remove("is-in");
      document.body.classList.remove("consent-open");
      var removed = false;
      var finish = function () {
        if (removed) return;
        removed = true;
        banner.remove();
      };
      banner.addEventListener("transitionend", finish);
      setTimeout(finish, 600);
    };

    banner.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-consent]");
      if (btn) dismiss(btn.getAttribute("data-consent"));
    });

    document.body.appendChild(banner);
    document.body.style.setProperty("--consent-h", banner.offsetHeight + "px");
    document.body.classList.add("consent-open");
    requestAnimationFrame(function () {
      banner.classList.add("is-in");
    });
  }

  // Reabertura via link "Cookies" no rodapé
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-consent]")) {
      e.preventDefault();
      showBanner();
    }
  });

  var consent = store.get();
  if (consent === "granted") loadGA();

  if (!consent) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showBanner);
    } else {
      showBanner();
    }
  }
})();

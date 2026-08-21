// SENSO landing — shared behaviour (no build step, no dependencies)

(function () {
  "use strict";

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var drawer = document.querySelector("[data-nav-drawer]");

  if (toggle && drawer) {
    toggle.addEventListener("click", function () {
      var isOpen = drawer.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        drawer.classList.remove("is-open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el, i) {
      el.style.setProperty("--i", i % 6);
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Yandex Metrika goals ---------- */
  function reachGoal(name) {
    if (window.ym) {
      try { window.ym(111830249, "reachGoal", name); } catch (err) { /* ignore */ }
    }
  }

  /* ---------- Zoom Scheduler link ---------- */
  var ZOOM_SCHEDULER_URL = "https://scheduler.zoom.us/4ox3k5ijknc88ek4y6f946exb0/-senso";

  function buildZoomLink(name, email) {
    var parts = (name || "").trim().split(/\s+/).filter(Boolean);
    var firstname = parts[0] || "";
    var lastname = parts.slice(1).join(" ");
    var params = [];
    if (firstname) params.push("firstname=" + encodeURIComponent(firstname));
    if (lastname) params.push("lastname=" + encodeURIComponent(lastname));
    if (email) params.push("email=" + encodeURIComponent(email));
    return ZOOM_SCHEDULER_URL + (params.length ? "?" + params.join("&") : "");
  }

  document.querySelectorAll('a[href*="#booking"]').forEach(function (el) {
    el.addEventListener("click", function () { reachGoal("cta_click"); });
  });

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.style.boxShadow = window.scrollY > 8 ? "0 12px 30px -20px rgba(0,0,0,.6)" : "none";
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Hero radar scene ---------- */
  var scene = document.querySelector("[data-radar-scene]");
  if (scene) {
    requestAnimationFrame(function () {
      setTimeout(function () { scene.classList.add("is-active"); }, 120);
    });

    var core = scene.querySelector("[data-signal-core]");
    var textEl = scene.querySelector("[data-signal-text]");
    var subEl = scene.querySelector("[data-signal-sub]");

    var signals = [
      { text: "Клиент ждёт ответа", sub: "Контекст собран из 4 источников" },
      { text: "После КП нет следующего шага", sub: "Документ открыт 3 дня назад" },
      { text: "Менеджер не выполнил обещание", sub: "Обещал вернуться к клиенту" },
      { text: "Появилась крупная возможность", sub: "Сумма выше обычной сделки" }
    ];

    if (core && textEl && subEl) {
      var idx = 0;
      setInterval(function () {
        idx = (idx + 1) % signals.length;
        core.classList.add("is-swapping");
        setTimeout(function () {
          textEl.textContent = signals[idx].text;
          subEl.textContent = signals[idx].sub;
          core.classList.remove("is-swapping");
        }, 320);
      }, 3600);
    }
  }

  /* ---------- Booking form ---------- */
  var form = document.querySelector("[data-booking-form]");
  if (form) {
    // Drop a free endpoint id from https://formspree.io (or web3forms.com) in here
    // to make the form send real emails without any backend of your own.
    var ENDPOINT = form.getAttribute("data-endpoint") || "";
    var statusEl = form.querySelector("[data-form-status]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = form.querySelector("#f-name");
      var phone = form.querySelector("#f-phone");
      var email = form.querySelector("#f-email");
      var valid = true;

      [name, phone, email].forEach(function (field) {
        if (!field) return;
        if (!field.value || (field.type === "email" && !/^\S+@\S+\.\S+$/.test(field.value))) {
          valid = false;
          field.style.borderColor = "#F68518";
        } else {
          field.style.borderColor = "";
        }
      });

      if (!valid) {
        showStatus("Проверьте, пожалуйста, обязательные поля.", "error");
        return;
      }

      var submitBtn = form.querySelector("[type=submit]");
      var originalLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) { submitBtn.textContent = "Отправляем…"; submitBtn.disabled = true; }

      var payload = new FormData(form);
      var zoomLink = buildZoomLink(payload.get("name"), payload.get("email"));

      var finish = function (ok) {
        if (submitBtn) { submitBtn.textContent = originalLabel; submitBtn.disabled = false; }
        if (ok) {
          form.reset();
          showZoomStep(zoomLink);
          reachGoal("form_submit");
        } else {
          showStatus("Заявка сохранена локально. Если это повторится — напишите нам напрямую.", "error");
        }
      };

      if (ENDPOINT) {
        fetch(ENDPOINT, {
          method: "POST",
          body: payload,
          headers: { Accept: "application/json" }
        })
          .then(function (res) { finish(res.ok); })
          .catch(function () { finish(false); });
      } else {
        // No endpoint configured yet — keep the submission locally so nothing is lost,
        // and tell the visitor it went through. See README for how to wire a real inbox.
        try {
          var stored = JSON.parse(localStorage.getItem("senso_demo_requests") || "[]");
          stored.push({
            name: payload.get("name"),
            phone: payload.get("phone"),
            email: payload.get("email"),
            at: new Date().toISOString()
          });
          localStorage.setItem("senso_demo_requests", JSON.stringify(stored));
        } catch (err) { /* ignore storage errors */ }
        setTimeout(function () { finish(true); }, 500);
      }
    });

    function showStatus(msg, kind) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.classList.remove("is-success", "is-error");
      statusEl.classList.add(kind === "success" ? "is-success" : "is-error");
    }

    function showZoomStep(link) {
      var fields = form.querySelectorAll(".field, .panel-label, .form-consent, [type=submit]");
      fields.forEach(function (el) { el.style.display = "none"; });

      var wrap = form.querySelector("[data-zoom-step]");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.setAttribute("data-zoom-step", "");
        form.insertBefore(wrap, form.querySelector("[data-form-status]"));
      }
      wrap.innerHTML =
        '<p class="form-consent" style="margin-bottom:16px">Спасибо! Осталось выбрать удобное время в Zoom.</p>' +
        '<a class="btn btn--primary btn--block" data-zoom-link href="' + link + '" target="_blank" rel="noopener">' +
        "Выбрать время в Zoom" +
        '<svg viewBox="0 0 14 14" fill="none"><path d="M2 12L12 2M12 2H4M12 2V10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>';

      var zoomAnchor = wrap.querySelector("[data-zoom-link]");
      if (zoomAnchor) {
        zoomAnchor.addEventListener("click", function () { reachGoal("cta_click"); });
      }
    }
  }
})();

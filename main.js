/* J RANCH — site interactions */
(function () {
  "use strict";

  /* ---- mobile nav toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // close menu when a real link is tapped
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- accessible "Hunts" dropdown ---- */
  document.querySelectorAll(".has-drop > .navbtn").forEach(function (btn) {
    var drop = btn.nextElementSibling;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = drop.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function () {
    document.querySelectorAll(".drop.open").forEach(function (d) {
      d.classList.remove("open");
      var b = d.previousElementSibling;
      if (b) b.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".drop.open").forEach(function (d) {
        d.classList.remove("open");
      });
      if (links && links.classList.contains("open")) {
        links.classList.remove("open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }
    }
  });

  /* ---- scroll reveal ---- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll("[data-reveal]");
  if (!reduce && "IntersectionObserver" in window && items.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var el = en.target;
            var delay = el.getAttribute("data-delay") || 0;
            setTimeout(function () {
              el.classList.add("in");
            }, delay);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  } else {
    items.forEach(function (el) {
      el.classList.add("in");
    });
  }

  /* ---- inquiry form: send via /api/inquiry ---- */
  var form = document.getElementById("inquiry-form");
  if (form) {
    var note = document.getElementById("form-note");
    var btn = form.querySelector('button[type="submit"]');

    function showNote(ok, msg) {
      if (!note) return;
      note.classList.toggle("is-error", !ok);
      note.textContent =
        msg ||
        (ok
          ? "Thanks — your request is in. We'll be in touch shortly with availability."
          : "Sorry — we couldn't send that. Please call or text (337) 802-1336 and we'll take care of you.");
      note.hidden = false;
      note.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = {};
      new FormData(form).forEach(function (v, k) {
        data[k] = v;
      });

      var label = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending…";
      }

      fetch(form.getAttribute("action") || "/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (r) {
          return r
            .json()
            .catch(function () {
              return {};
            })
            .then(function (payload) {
              if (!r.ok) throw new Error(payload.error || "Request failed");
              return payload;
            });
        })
        .then(function () {
          showNote(true);
          form.reset(); // also resets the calendar via its "reset" listener
        })
        .catch(function (err) {
          showNote(false, err && err.message && /valid email|name/i.test(err.message) ? err.message : null);
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = label;
          }
        });
    });
  }
})();

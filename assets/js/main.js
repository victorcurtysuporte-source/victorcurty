/* Dr. Victor Curty — baseline interactions (no external deps).
   Runs regardless of GSAP/Three availability so the page is always
   fully functional and content always becomes visible. */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* Enable JS-only initial states (hidden reveals) only when we will
     actually animate. If this script runs, reveals are guaranteed to be
     shown below, so there is no risk of content staying hidden. */
  if (!reduceMotion) document.documentElement.classList.add("js");

  /* ---------- Header on scroll + progress bar ----------
     Ler scrollHeight dentro do handler de scroll força um recálculo de
     layout a cada evento, intercalado com as escritas de transform do
     ScrollTrigger. Em páginas longas isso vira layout thrashing. Aqui o
     limite de rolagem fica em cache (recalculado só quando o documento
     muda de tamanho) e a escrita é agrupada num rAF. */
  const header = document.querySelector(".header");
  const progress = document.querySelector(".scroll-progress");
  /* Barra de ação fixa do mobile: aparece assim que o hero sai da tela, para
     que preço e contato fiquem a um toque em qualquer ponto da rolagem. Vai
     junto do handler de scroll que já existe, em vez de um observer novo. */
  const mobileCta = document.querySelector(".mobile-cta");
  const firstSection = document.querySelector("main > section");
  let scrollMax = 0;
  let ticking = false;

  const medir = () => {
    scrollMax = document.documentElement.scrollHeight - window.innerHeight;
  };

  const pintar = () => {
    ticking = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 24);
    if (progress) {
      progress.style.transform = `scaleX(${scrollMax > 0 ? y / scrollMax : 0})`;
    }
    if (mobileCta && firstSection) {
      mobileCta.classList.toggle("is-visible", y > firstSection.offsetHeight);
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(pintar);
  };

  medir();
  pintar();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    medir();
    onScroll();
  });
  // Imagens lazy e acordeões mudam a altura do documento depois do load.
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      medir();
      onScroll();
    }).observe(document.body);
  }

  /* ---------- Mobile menu ---------- */
  const burger = document.querySelector(".burger");
  const menu = document.querySelector(".mobile-menu");
  if (burger && menu) {
    const setOpen = (open) => {
      menu.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    };
    burger.addEventListener("click", () =>
      setOpen(burger.getAttribute("aria-expanded") !== "true")
    );
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => setOpen(false))
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open"))
        setOpen(false);
    });
  }

  /* ---------- Accordion ----------
     A altura aberta é fixada em pixels para a transição funcionar. Isso
     desatualiza quando a largura muda e o texto reflui: girar o celular com
     uma resposta aberta cortava o final dela. Os painéis abertos são
     remedidos no resize. */
  const accBtns = Array.from(document.querySelectorAll(".acc__btn"));
  accBtns.forEach((btn) => {
    const panel = btn.nextElementSibling;
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      panel.style.maxHeight = open ? "0px" : panel.scrollHeight + "px";
    });
  });

  if (accBtns.length) {
    let remedir;
    window.addEventListener("resize", () => {
      clearTimeout(remedir);
      remedir = setTimeout(() => {
        accBtns.forEach((btn) => {
          if (btn.getAttribute("aria-expanded") !== "true") return;
          const panel = btn.nextElementSibling;
          /* Solta o limite para o painel assumir a altura real do novo
             refluxo, depois refixa em pixels. */
          panel.style.maxHeight = "none";
          const altura = panel.scrollHeight;
          panel.style.maxHeight = altura + "px";
        });
      }, 150);
    });
  }

  /* ---------- Scroll reveal (baseline) ---------- */
  const reveals = document.querySelectorAll(".reveal, .reveal-clip, .step");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Hero entrance ---------- */
  const hero = document.querySelector(".hero");
  if (hero) {
    const revealHero = () => hero.classList.add("is-in");
    requestAnimationFrame(revealHero);
    // Fallback: rAF is throttled in background/unfocused tabs, which would
    // leave the hero content stuck at opacity 0. Guarantee the reveal.
    setTimeout(revealHero, 200);
  }

  /* ---------- Active nav on scroll ---------- */
  const navLinks = Array.from(
    document.querySelectorAll('.nav__link[href^="#"], .mobile-menu__nav a[href^="#"]')
  );
  const sections = navLinks
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = "#" + entry.target.id;
          navLinks.forEach((l) =>
            l.classList.toggle("is-active", l.getAttribute("href") === id)
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Forms ----------
     Entrega real via Netlify Forms. Cada <form data-form> declara
     name + data-netlify="true" + um campo oculto form-name, e a Netlify
     detecta o formulário no HTML estático no momento do deploy.

     O POST vai para a própria origem, codificado como
     application/x-www-form-urlencoded, e o estado de sucesso só aparece
     quando a Netlify responde 2xx. Qualquer outra resposta mantém os
     dados preenchidos e mostra erro, para que o visitante possa repetir.

     Fora da Netlify (abrindo o arquivo local, por exemplo) o POST falha e
     o formulário mostra o estado de erro — nunca um sucesso simulado.
     O WhatsApp continua disponível como canal secundário, mas nos links
     próprios da página, nunca disparado automaticamente pelo envio. */
  const FORM_TIMEOUT_MS = 15000;

  const setStatus = (status, type, message) => {
    if (!status) return;
    status.className = "form__status is-" + type;
    status.textContent = message;
  };

  const encodeForm = (form) =>
    new URLSearchParams(new FormData(form)).toString();

  document.querySelectorAll("form[data-form]").forEach((form) => {
    const status = form.querySelector(".form__status");
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn ? submitBtn.textContent : "";
    let sending = false;

    const showFieldError = (field, on) => {
      field.closest(".field")?.classList.toggle("is-invalid", on);
    };

    form.querySelectorAll("input, select, textarea").forEach((el) => {
      const revalidate = () => showFieldError(el, !el.checkValidity());
      el.addEventListener("input", revalidate);
      el.addEventListener("change", revalidate);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending) return;
      if (status) status.className = "form__status";

      let firstInvalid = null;
      form.querySelectorAll("input, select, textarea").forEach((el) => {
        const ok = el.checkValidity();
        showFieldError(el, !ok);
        if (!ok && !firstInvalid) firstInvalid = el;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        setStatus(status, "error", "Revise os campos destacados antes de enviar.");
        return;
      }

      sending = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando...";
      setStatus(status, "loading", "Enviando suas informações...");

      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), FORM_TIMEOUT_MS);

      try {
        const res = await fetch(form.getAttribute("action") || "/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: encodeForm(form),
          signal: abort.signal,
        });
        if (res.ok) {
          setStatus(status, "success", form.dataset.success);
          form.reset();
          form
            .querySelectorAll(".is-invalid")
            .forEach((f) => f.classList.remove("is-invalid"));
        } else {
          setStatus(
            status,
            "error",
            "Não foi possível enviar agora. Tente novamente em instantes ou fale pelo WhatsApp."
          );
        }
      } catch (err) {
        setStatus(
          status,
          "error",
          err.name === "AbortError"
            ? "O envio demorou demais. Verifique sua conexão e tente novamente."
            : "Falha de conexão. Verifique sua internet e tente novamente."
        );
      } finally {
        clearTimeout(timer);
        sending = false;
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      }
    });
  });
})();

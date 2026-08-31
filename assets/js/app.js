/* Enhancement layer — additive only.
   Three.js hero field + GSAP/ScrollTrigger polish. Everything here
   degrades gracefully: the baseline (main.js) already reveals content
   and runs all interactions, so a blocked CDN only removes flourish. */

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* ---------- Three.js constellation field ----------
   Import dinâmico: o Three só é baixado nas páginas que têm o canvas do
   hero e quando o campo vai realmente rodar. Páginas sem canvas (e quem
   pede menos movimento) não pagam o custo da biblioteca. */
let field = null;
const canvas = document.querySelector(".hero__canvas");
if (canvas && !reduceMotion) {
  import("./performance-field.js?v=33")
    .then(({ initPerformanceField }) => {
      // Retorna null sem WebGL — nesse caso o gradiente do CSS permanece.
      field = initPerformanceField(canvas, { particleCount: 130, intensity: 0.6 });
    })
    .catch(() => {
      /* CDN bloqueada: o gradiente do CSS continua sendo o fundo. */
    });
}
window.addEventListener("pagehide", () => field && field.destroy());

/* ---------- GSAP ScrollTrigger polish ---------- */
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

if (gsap && ScrollTrigger && !reduceMotion) {
  gsap.registerPlugin(ScrollTrigger);

  const ctx = gsap.context(() => {
    // Method connecting line grows across the pillars
    document.querySelectorAll(".method__line span").forEach((line) => {
      gsap.to(line, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: line.closest(".method"),
          start: "top 75%",
          end: "bottom 65%",
          scrub: 0.6,
        },
      });
    });

    // Timeline progress line fills as you scroll through it
    document.querySelectorAll(".timeline__progress").forEach((line) => {
      gsap.to(line, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: line.closest(".timeline"),
          start: "top 70%",
          end: "bottom 60%",
          scrub: 0.6,
        },
      });
    });

    // Decorative dividers that grow horizontally into view
    document.querySelectorAll("[data-grow-line]").forEach((line) => {
      gsap.fromTo(
        line,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: line,
            start: "top 90%",
            end: "top 55%",
            scrub: 0.5,
          },
        }
      );
    });

    // Subtle vertical parallax on flagged media
    document.querySelectorAll("[data-parallax]").forEach((el) => {
      const depth = parseFloat(el.dataset.parallax) || 40;
      gsap.fromTo(
        el,
        { y: -depth / 2 },
        {
          y: depth / 2,
          ease: "none",
          scrollTrigger: {
            trigger: el.closest("section") || el,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        }
      );
    });

    // Number stagger for stat/fact rows.
    // O from() roda dentro do onEnter, não como tween com scrollTrigger. Assim
    // o GSAP nunca escreve opacity:0 inline antes da hora: se o gatilho não
    // disparar, o conteúdo simplesmente aparece sem animação, em vez de ficar
    // invisível para sempre. Estilo inline vence classe, então o .reveal do CSS
    // não conseguiria resgatar esses elementos.
    document.querySelectorAll("[data-stagger]").forEach((group) => {
      ScrollTrigger.create({
        trigger: group,
        start: "top 80%",
        once: true,
        onEnter: () =>
          gsap.from(group.children, {
            y: 24,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.08,
          }),
      });
    });
  });

  window.addEventListener("pagehide", () => ctx.revert());
}

// What is Robe? Each drawn scene plays once it comes into view (styles.css .what-scene.in); the
// parcel travels across the map along its route (SVG animateMotion). Still with Reduce Motion.
(function () {
  "use strict";
  const scenes = document.querySelectorAll(".what-scene");
  if (!scenes.length) return;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const play = (scene) => {
    scene.classList.add("in");
    const travel = scene.querySelector("animateMotion");
    if (travel && !still) setTimeout(() => { try { travel.beginElement(); } catch (e) {} }, 300);
    if (travel && still) {
      const parcel = scene.querySelector(".parcel");
      if (parcel) parcel.setAttribute("transform", "translate(73.5 155)");
    }
  };
  if (still || !("IntersectionObserver" in window)) { scenes.forEach(play); return; }
  const watch = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { play(e.target); watch.unobserve(e.target); } });
  }, { threshold: 0.35 });
  scenes.forEach((s) => watch.observe(s));
})();

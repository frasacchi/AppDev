// The opening animation's maths: where everything is at each moment, with no
// drawing in it. The woman from the R stands large, reaches up and adjusts her
// hat, snaps back into the R pose, then glides left and shrinks into the logo
// while O, B and E type in one after another behind a blush caret.
//
// The same numbers are in the apps (IntroMotion.kt / IntroMotion.swift, with
// tests), so all three play the same intro.
//
// Her arm moves as one piece that swings forward and up through depth: its
// height is squashed by `fold` (1 = as drawn, 0 = pointing at you, below 0 =
// raised) and turned by `turn` about the shoulder, so its hand-drawn outlines
// stay intact. Near the neck the arm blends back into the body.

(function () {
  const SHOULDER = [112, 92];
  const NECK = [100, 78];
  const BLEND_FROM = 3, BLEND_OVER = 20;
  /** Her hand on her hip, in the logo. */
  const HAND = [108, 184];
  /** The hat turns about the top of her head; she holds it by the brim. */
  const HAT_PIVOT = [95, 36];
  const GRIP = [150, 34];
  const BRIM_TIP = [158, 28];
  /** How much bigger than the logo's R she stands at the start. */
  const BIG = 1.3;

  // Beats, in seconds.
  const REACH = [0.15, 0.55], LIFT = [0.55, 0.8], TUG = [0.8, 1.1], SETTLE = [1.1, 1.3], RELEASE = [1.3, 1.62];
  const GROW = [0, 1.4], PUNCH = [1.62, 1.92], TRAVEL = [1.85, 2.45];
  const SWISH_UP = [1.5, 1.68], SWISH_DOWN = [1.68, 2.4], SWISH_PEAK = 0.35;
  const SPARKLE = [1.15, 1.75];
  const STRIKES = [2.28, 2.42, 2.56], STRIKE_LENGTH = 0.14;
  const CARET = [2.12, 3.05], BLINK = 0.18;
  const TAGLINE = [2.78, 3.18], FADE = [3.55, 3.95];
  const DURATION = 3.95;
  const LIFT_TURN = -9, TUG_TURN = 3.5, LIFT_Y = -5, TUG_Y = 1;

  const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
  const span = (t, [a, b]) => clamp((t - a) / (b - a));
  const smooth = (u) => u * u * (3 - 2 * u);
  const easeOut = (u) => 1 - Math.pow(1 - u, 3);
  const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const backOut = (u) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
  const rad = (deg) => (deg * Math.PI) / 180;

  const REST = { fold: 1, turn: 0, hatTurn: 0, hatX: 0, hatY: 0 };

  function hatPoint(x, y, pose) {
    if (pose.hatTurn === 0 && pose.hatX === 0 && pose.hatY === 0) return [x, y];
    const c = Math.cos(pose.hatTurn), s = Math.sin(pose.hatTurn);
    const dx = x - HAT_PIVOT[0], dy = y - HAT_PIVOT[1];
    return [HAT_PIVOT[0] + dx * c - dy * s + pose.hatX, HAT_PIVOT[1] + dx * s + dy * c + pose.hatY];
  }

  /** How much of the arm's move a point takes: none at the neck, all of it past the shoulder. */
  function armShare(x, y) {
    return smooth(clamp((Math.hypot(x - NECK[0], y - NECK[1]) - BLEND_FROM) / BLEND_OVER));
  }

  function armPoint(x, y, pose) {
    if (pose.fold === 1 && pose.turn === 0) return [x, y];
    const dx = x - SHOULDER[0], dy = (y - SHOULDER[1]) * pose.fold;
    const c = Math.cos(pose.turn), s = Math.sin(pose.turn);
    const qx = SHOULDER[0] + dx * c - dy * s, qy = SHOULDER[1] + dx * s + dy * c;
    const w = armShare(x, y);
    return [x + (qx - x) * w, y + (qy - y) * w];
  }

  /** The fold and turn that put her hand on `target` (reaching up, so fold is negative). */
  function armFor(target) {
    const rx = target[0] - SHOULDER[0], ry = target[1] - SHOULDER[1];
    const hx = HAND[0] - SHOULDER[0], hy = HAND[1] - SHOULDER[1];
    const fold = clamp(-Math.sqrt(Math.max(rx * rx + ry * ry - hx * hx, 0)) / hy, -1, 1);
    return { fold, turn: Math.atan2(ry, rx) - Math.atan2(fold * hy, hx) };
  }

  function hatAt(t) {
    if (t < LIFT[0]) return { turn: 0, y: 0 };
    if (t < TUG[0]) {
      const u = easeOut(span(t, LIFT));
      return { turn: LIFT_TURN * u, y: LIFT_Y * u };
    }
    if (t < SETTLE[0]) {
      const u = easeInOut(span(t, TUG));
      return { turn: LIFT_TURN + (TUG_TURN - LIFT_TURN) * u, y: LIFT_Y + (TUG_Y - LIFT_Y) * u };
    }
    const u = easeOut(span(t, SETTLE));
    return { turn: TUG_TURN * (1 - u), y: TUG_Y * (1 - u) };
  }

  function poseAt(t) {
    if (t <= REACH[0] || t >= RELEASE[1]) return REST;
    const grip = armFor(GRIP);
    if (t < REACH[1]) {
      const u = easeInOut(span(t, REACH));
      return { ...REST, fold: 1 + (grip.fold - 1) * u, turn: grip.turn * u };
    }
    if (t < RELEASE[0]) {
      const hat = hatAt(t);
      const pose = { ...REST, hatTurn: rad(hat.turn), hatY: hat.y };
      const arm = armFor(hatPoint(GRIP[0], GRIP[1], pose));
      return { ...pose, fold: arm.fold, turn: arm.turn };
    }
    // She lets go and snaps back into the R, the arm swinging a touch past it.
    const u = span(t, RELEASE);
    return { ...REST, fold: grip.fold + (1 - grip.fold) * easeOut(u), turn: grip.turn * (1 - backOut(u)) };
  }

  /** A letter striking the page: it drops in from a little above, slightly large, and lands. */
  function strike(p) {
    const e = easeOut(p);
    return { alpha: clamp(p * 3), drop: -0.05 * (1 - e), scale: 1 + 0.1 * (1 - e) };
  }

  /** Everything at `t` seconds. */
  function at(t) {
    const strikes = STRIKES.map((s) => span(t, [s, s + STRIKE_LENGTH]));
    const typed = STRIKES.filter((s) => t >= s).length;
    const blinking = t >= STRIKES[2] + STRIKE_LENGTH;
    const caretOn = t >= CARET[0] && t < CARET[1] && (!blinking || Math.floor((t - STRIKES[2] - STRIKE_LENGTH) / BLINK) % 2 === 0);
    let swish = 0;
    if (t >= SWISH_UP[0] && t < SWISH_UP[1]) swish = SWISH_PEAK * easeOut(span(t, SWISH_UP));
    else if (t >= SWISH_UP[1] && t < SWISH_DOWN[1]) swish = SWISH_PEAK * (1 - smooth(span(t, SWISH_DOWN)));
    const inPunch = t > PUNCH[0] && t < PUNCH[1];
    return {
      pose: poseAt(t),
      grow: easeOut(span(t, GROW)),
      punch: inPunch ? 1 + 0.035 * Math.sin(Math.PI * span(t, PUNCH)) : 1,
      travel: easeInOut(span(t, TRAVEL)),
      swish,
      sparkle: t >= SPARKLE[0] && t < SPARKLE[1] ? span(t, SPARKLE) : -1,
      strikes,
      typed,
      caret: caretOn ? 1 : 0,
      tagline: easeOut(span(t, TAGLINE)),
      fade: 1 - span(t, FADE),
    };
  }

  /** The R's height on screen: from `start` up to BIG times it, then down to `end` as she travels. */
  function figureHeight(frame, start, end) {
    const grown = start * (1 + (BIG - 1) * frame.grow);
    return (grown + (end - grown) * frame.travel) * frame.punch;
  }

  window.RobeIntro = {
    at, poseAt, strike, armPoint, hatPoint, armFor, armShare, figureHeight,
    REST, BIG, DURATION, GRIP, BRIM_TIP, HAND, STRIKES,
    /** The caret's top and bottom as a share of the R's height (the letters' cap height and baseline). */
    CARET_TOP: 0.143, CARET_BOTTOM: 0.948,
  };
})();

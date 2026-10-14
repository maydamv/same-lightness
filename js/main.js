import { hslToRgb, oklchToRgb, inGamut, luminance, asGrey, rgbToHex, toLinear, fromLinear, WEIGHTS, contrast, hexToRgb, simulate } from "./colour.js";

// 12 hues around the colour wheel, one every 30°
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

// The game: pairs of hues, all hsl(h 100% 50%). They get harder as the
// difference in light gets smaller.
const PAIRS = [
  [60, 240],  // yellow vs blue
  [0, 120],   // red vs green
  [180, 300], // cyan vs magenta
  [270, 30],  // violet vs orange
  [210, 300], // azure vs magenta
];

// "Match the grey": four hues, always against the same grey
const MATCH_HUES = [240, 60, 120, 300];
const HUE_NAMES = { 60: "Yellow", 120: "Green", 240: "Blue", 300: "Magenta" };
const TARGET = 0.2; // the grey's luminance: 20% of the light of white

const state = {
  match: { round: 0, l: 50, checked: false, results: [] }, // l: the slider, in %
  game: { round: 0, guess: null, score: 0 }, // guess: 0 or 1, the tile clicked
  unlocked: false, // the explanation shows once the game is finished or skipped
  hslL: 60,  // HSL lightness, in %
  okL: 60,   // OKLCH lightness, in %
  linked: true, // the two sliders move together
  picked: { model: "hsl", hue: 240 }, // the colour shown in "Under the hood"
  text: "#ffffff", // the contrast checker
  bg: "#ffff00",
  vision: "normal", // how the page is painted (section 4)
};

// WCAG's minimum ratios
const LEVELS = [
  { name: "AA, large text", min: 3 },
  { name: "AA, normal text", min: 4.5 },
  { name: "AAA, normal text", min: 7 },
];

const $ = (selector) => document.querySelector(selector);

// Every colour goes on screen through here, so the vision simulator
// changes all of them. The maths always uses the real colour.
function paint(rgb) {
  return rgbToHex(simulate(rgb, state.vision));
}

function drawGame() {
  const { round, guess, score } = state.game;
  const finished = round === PAIRS.length;
  const header = $(".game");

  // after the last pair, the tiles show the first one again, revealed
  const hues = PAIRS[finished ? 0 : round];
  const colours = hues.map((hue) => hslToRgb(hue, 1, 0.5));
  const lights = colours.map(luminance);
  const lighter = lights[0] > lights[1] ? 0 : 1;

  ["#tile-a", "#tile-b"].forEach((id, i) => {
    const tile = $(id);
    tile.querySelector(".paint").style.background = paint(colours[i]);
    tile.querySelector(".truth").style.background = paint(asGrey(colours[i]));
    tile.querySelector(".tile-name").textContent = guess === null
      ? `hsl(${hues[i]} 100% 50%)`
      : `hsl(${hues[i]} 100% 50%), light ${lights[i].toFixed(2)}`;
    tile.disabled = guess !== null || finished;
    tile.setAttribute("aria-pressed", String(guess === i));
  });

  // the grey half slides in once there's a guess
  header.classList.toggle("revealed", guess !== null || finished);

  if (finished) {
    $("#question").textContent = `Your eyes saw ${score} of ${PAIRS.length} differences. HSL saw none.`;
    $("#verdict").textContent = "Every pair had the same HSL lightness, 50%.";
    $("#next").textContent = "Play again";
  } else if (guess === null) {
    $("#question").textContent = "Which one is lighter?";
    $("#verdict").textContent = "Both have the same lightness in HSL: 50%. Trust your eyes and click one.";
  } else {
    const times = Math.max(...lights) / Math.min(...lights);
    $("#verdict").textContent = `${guess === lighter ? "Right" : "Not this time"}: the grey shows the real light. `
      + `One sends ${times.toFixed(1)}× more light than the other, and HSL calls them equal.`;
    $("#next").textContent = round === PAIRS.length - 1 ? "See my score" : "Next pair";
  }
  $("#next").hidden = guess === null && !finished;
  $("#see-why").hidden = !finished;
  $("#skip").hidden = state.unlocked;
  $("#round").textContent = finished ? "" : `Pair ${round + 1} of ${PAIRS.length}`;

  // the explanation waits for the game: finish it or skip it
  $("#explanation").hidden = !state.unlocked;
  $("#locked").hidden = state.unlocked;
}

// Show the explanation and take the reader to its first heading
function openExplanation() {
  state.unlocked = true;
  render();
  // focus scrolls to the heading, and keyboard and screen readers start reading there
  $("#rows h2").focus();
}

// The light of hsl(hue 100% l%)
function lightAt(hue, l) {
  return luminance(hslToRgb(hue, 1, l / 100));
}

// The HSL lightness that sends the same light as the grey: try every L, keep the closest
function neededL(hue) {
  let best = 0;
  for (let l = 0; l <= 100; l++) {
    if (Math.abs(lightAt(hue, l) - TARGET) < Math.abs(lightAt(hue, best) - TARGET)) best = l;
  }
  return best;
}

function drawMatch() {
  const { round, l, checked, results } = state.match;
  const finished = round === MATCH_HUES.length;
  const hue = MATCH_HUES[finished ? MATCH_HUES.length - 1 : round];
  const colour = hslToRgb(hue, 1, l / 100);
  const g = fromLinear(TARGET);

  $("#match-grey").style.background = paint([g, g, g]);
  $("#match-colour").style.background = paint(colour);
  $("#match-truth").style.background = paint(asGrey(colour));
  $("#match-name").textContent = `hsl(${hue} 100% ${l}%)`;
  $("#match-l").value = l;
  $("#match-l").disabled = checked || finished;
  $("#match-box").classList.toggle("checked", checked || finished); // shows the colour's own grey

  $("#match-check").hidden = checked || finished;
  $("#match-next").hidden = !checked && !finished;
  $("#match-next").textContent = finished ? "Play again" : round === MATCH_HUES.length - 1 ? "See the results" : "Next colour";

  const last = results.at(-1);
  $("#match-result").textContent = checked && !finished
    ? `${last.points} points. You chose L ${last.l}%; it needed L ${last.needed}%. The grey half shows your colour's real light.`
    : finished ? "" : `${HUE_NAMES[hue]} ${round + 1} of ${MATCH_HUES.length}: make it as light as the grey.`;

  $("#match-summary").hidden = !finished;
  if (finished) {
    $("#match-rows").replaceChildren(...results.map((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<th></th><td></td><td></td><td></td>`;
      [HUE_NAMES[r.hue], `${r.l}%`, `${r.needed}%`, r.points].forEach((value, i) => (tr.children[i].textContent = value));
      return tr;
    }));
    const total = results.reduce((sum, r) => sum + r.points, 0);
    const needs = results.map((r) => r.needed);
    $("#match-total").textContent = `${total} of ${results.length * 100} points. The same grey needed L from `
      + `${Math.min(...needs)}% to ${Math.max(...needs)}%: same light, very different HSL lightness.`;
  }
}

// The OKLCH row's chroma: the most colourful one at which all 12 hues still fit
// on a screen. Lowering the chroma keeps every hue as it is; clamping wouldn't.
function rowChroma() {
  const l = state.okL / 100;
  let c = 0.15;
  while (!HUES.every((hue) => inGamut(l, c, hue))) c -= 0.005;
  return Number(c.toFixed(3));
}

// The colour of one swatch, from the row it's in and its hue
function colourOf(model, hue) {
  if (model === "hsl") return hslToRgb(hue, 1, state.hslL / 100);
  return oklchToRgb(state.okL / 100, rowChroma(), hue);
}

function swatch(model, hue) {
  const rgb = colourOf(model, hue);
  const li = document.createElement("li");
  li.innerHTML = `
    <button type="button" aria-label="${model} hue ${hue}°">
      <span class="colour"></span>
      <span class="grey"></span>
      <small></small>
    </button>`;
  li.querySelector(".colour").style.background = paint(rgb);
  li.querySelector(".grey").style.background = paint(asGrey(rgb));
  li.querySelector("small").textContent = luminance(rgb).toFixed(2);
  li.querySelector("button").addEventListener("click", () => {
    state.picked = { model, hue };
    render();
  });
  const picked = state.picked.model === model && state.picked.hue === hue;
  li.querySelector("button").setAttribute("aria-pressed", String(picked));
  return li;
}

// The darkest and the brightest light in a row
function lightRange(model) {
  const lights = HUES.map((hue) => luminance(colourOf(model, hue)));
  return { min: Math.min(...lights), max: Math.max(...lights) };
}

// "Light from 0.07 to 0.93": how far apart the brightest and darkest are
function spread(model) {
  const { min, max } = lightRange(model);
  return `Light from ${min.toFixed(2)} to ${max.toFixed(2)}: the brightest is ${(max / min).toFixed(1)}× the darkest.`;
}

function drawRows() {
  // when the sliders are linked, moving one moves the other: draw both from state
  $("#hsl-l").value = state.hslL;
  $("#ok-l").value = state.okL;
  $("#link-sliders").checked = state.linked;
  $("#hsl-l-value").textContent = `${state.hslL}%`;
  $("#ok-l-value").textContent = `${state.okL}%`;
  $("#ok-c-value").textContent = rowChroma();
  $("#hsl-row").replaceChildren(...HUES.map((hue) => swatch("hsl", hue)));
  $("#ok-row").replaceChildren(...HUES.map((hue) => swatch("oklch", hue)));
  $("#hsl-spread").textContent = spread("hsl");
  $("#ok-spread").textContent = spread("oklch");
}

// The luminance formula, one step per row of the table
function drawHood() {
  const { model, hue } = state.picked;
  const rgb = colourOf(model, hue);
  const linear = rgb.map(toLinear);
  const light = linear.map((c, i) => c * WEIGHTS[i]);

  $("#hood-chip").style.background = paint(rgb);
  $("#hood-name").textContent = model === "hsl"
    ? `hsl(${hue} 100% ${state.hslL}%) = ${rgbToHex(rgb)}`
    : `oklch(${state.okL}% ${rowChroma()} ${hue}) = ${rgbToHex(rgb)}`;

  const steps = [
    ["Screen value, 0–255", rgb.map((c) => Math.round(c * 255))],
    ["Real light, gamma undone", linear.map((c) => c.toFixed(3))],
    ["× how sensitive the eye is", WEIGHTS],
    ["= light it adds", light.map((c) => c.toFixed(3))],
  ];
  $("#hood-body").replaceChildren(...steps.map(([label, values]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<th></th><td></td><td></td><td></td>`;
    tr.querySelector("th").textContent = label;
    values.forEach((value, i) => (tr.querySelectorAll("td")[i].textContent = value));
    return tr;
  }));

  // the bar is 100% wide for white: each channel fills its share of the light
  $("#bar-r").style.width = `${light[0] * 100}%`;
  $("#bar-g").style.width = `${light[1] * 100}%`;
  $("#bar-b").style.width = `${light[2] * 100}%`;

  const total = luminance(rgb);
  $("#hood-result").textContent = `Luminance = ${light.map((c) => c.toFixed(3)).join(" + ")} = ${total.toFixed(3)}, `
    + `${Math.round(total * 100)}% of the light of white.`;
}

// Step 3 undone: for a grey, OKLCH's L is exactly the cube root of its luminance,
// so L³ gives the light back. The colours in the OKLCH row land close to it.
function drawOklch() {
  const l = state.okL / 100;
  const { min, max } = lightRange("oklch");
  $("#ok-check").textContent = `Check it with the OKLCH row above: L is ${state.okL}%, and ${l.toFixed(2)}³ = ${(l ** 3).toFixed(2)}. `
    + `The light of its colours goes from ${min.toFixed(2)} to ${max.toFixed(2)}.`;
}

function drawContrast() {
  const ratio = contrast(hexToRgb(state.text), hexToRgb(state.bg));

  $("#text-colour").value = state.text;
  $("#bg-colour").value = state.bg;
  $("#preview").style.color = paint(hexToRgb(state.text));
  $("#preview").style.background = paint(hexToRgb(state.bg));
  $("#ratio").textContent = `${ratio.toFixed(2)} : 1`;

  $("#checks").replaceChildren(...LEVELS.map((level) => {
    const li = document.createElement("li");
    const pass = ratio >= level.min;
    li.className = pass ? "pass" : "fail";
    li.textContent = `${pass ? "✓" : "✗"} ${level.name} (${level.min} : 1)`;
    return li;
  }));
}

function render() {
  drawGame();
  drawRows();
  drawHood();
  drawMatch();
  drawOklch();
  drawContrast();
}

["#tile-a", "#tile-b"].forEach((id, i) => {
  $(id).addEventListener("click", () => {
    const hues = PAIRS[state.game.round];
    const lights = hues.map((hue) => luminance(hslToRgb(hue, 1, 0.5)));
    const lighter = lights[0] > lights[1] ? 0 : 1;
    state.game.guess = i;
    if (i === lighter) state.game.score += 1;
    render();
  });
});

$("#next").addEventListener("click", () => {
  const game = state.game;
  if (game.round === PAIRS.length) {
    state.game = { round: 0, guess: null, score: 0 }; // play again
  } else {
    game.round += 1;
    game.guess = null;
    if (game.round === PAIRS.length) state.unlocked = true; // finished: the explanation is earned
  }
  render();
});

$("#match-l").addEventListener("input", (event) => {
  state.match.l = Number(event.target.value);
  render();
});

$("#match-check").addEventListener("click", () => {
  const match = state.match;
  const hue = MATCH_HUES[match.round];
  const needed = neededL(hue);
  const points = Math.max(0, 100 - 4 * Math.abs(match.l - needed)); // 4 points off per L% away
  match.results.push({ hue, l: match.l, needed, points });
  match.checked = true;
  render();
});

$("#match-next").addEventListener("click", () => {
  const match = state.match;
  if (match.round === MATCH_HUES.length) {
    state.match = { round: 0, l: 50, checked: false, results: [] }; // play again
  } else {
    match.round += 1;
    match.l = 50;
    match.checked = false;
  }
  render();
});

$("#see-why").addEventListener("click", openExplanation);
$("#skip").addEventListener("click", openExplanation);

// Both rows get the same lightness number while the sliders are linked
function setLightness(model, value) {
  if (model === "hsl" || state.linked) state.hslL = value;
  if (model === "oklch" || state.linked) state.okL = value;
  render();
}

$("#hsl-l").addEventListener("input", (event) => setLightness("hsl", Number(event.target.value)));
$("#ok-l").addEventListener("input", (event) => setLightness("oklch", Number(event.target.value)));

$("#link-sliders").addEventListener("change", (event) => {
  state.linked = event.target.checked;
  if (state.linked) state.okL = state.hslL; // linking again: OKLCH catches up with HSL
  render();
});

$("#text-colour").addEventListener("input", (event) => {
  state.text = event.target.value;
  render();
});

$("#bg-colour").addEventListener("input", (event) => {
  state.bg = event.target.value;
  render();
});

// one listener for all the radio buttons: "change" bubbles up to the fieldset
$(".visions").addEventListener("change", (event) => {
  state.vision = event.target.value;
  render();
});

for (const button of document.querySelectorAll(".preset")) {
  button.addEventListener("click", () => {
    state.text = button.dataset.text;
    state.bg = button.dataset.bg;
    render();
  });
}

render();

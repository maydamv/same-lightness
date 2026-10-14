import { hslToRgb, oklchToRgb, luminance, asGrey, rgbToHex, toLinear, WEIGHTS, contrast, hexToRgb } from "./colour.js";

// 12 hues around the colour wheel, one every 30°
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const OK_CHROMA = 0.12; // low enough that every hue fits on a screen

const state = {
  hslL: 50,  // HSL lightness, in %
  okL: 70,   // OKLCH lightness, in %
  picked: { model: "hsl", hue: 240 }, // the colour shown in "Under the hood"
  text: "#ffffff", // the contrast checker
  bg: "#ffff00",
};

// WCAG's minimum ratios
const LEVELS = [
  { name: "AA, large text", min: 3 },
  { name: "AA, normal text", min: 4.5 },
  { name: "AAA, normal text", min: 7 },
];

const $ = (selector) => document.querySelector(selector);

// The colour of one swatch, from the row it's in and its hue
function colourOf(model, hue) {
  if (model === "hsl") return hslToRgb(hue, 1, state.hslL / 100);
  return oklchToRgb(state.okL / 100, OK_CHROMA, hue);
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
  li.querySelector(".colour").style.background = rgbToHex(rgb);
  li.querySelector(".grey").style.background = rgbToHex(asGrey(rgb));
  li.querySelector("small").textContent = luminance(rgb).toFixed(2);
  li.querySelector("button").addEventListener("click", () => {
    state.picked = { model, hue };
    render();
  });
  const picked = state.picked.model === model && state.picked.hue === hue;
  li.querySelector("button").setAttribute("aria-pressed", String(picked));
  return li;
}

// "Light from 0.07 to 0.93": how far apart the brightest and darkest are
function spread(model) {
  const lights = HUES.map((hue) => luminance(colourOf(model, hue)));
  const min = Math.min(...lights);
  const max = Math.max(...lights);
  return `Light from ${min.toFixed(2)} to ${max.toFixed(2)}: the brightest is ${(max / min).toFixed(1)}× the darkest.`;
}

function drawRows() {
  $("#hsl-l-value").textContent = `${state.hslL}%`;
  $("#ok-l-value").textContent = `${state.okL}%`;
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

  $("#hood-chip").style.background = rgbToHex(rgb);
  $("#hood-name").textContent = model === "hsl"
    ? `hsl(${hue} 100% ${state.hslL}%) = ${rgbToHex(rgb)}`
    : `oklch(${state.okL}% ${OK_CHROMA} ${hue}) = ${rgbToHex(rgb)}`;

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

function drawContrast() {
  const ratio = contrast(hexToRgb(state.text), hexToRgb(state.bg));

  $("#text-colour").value = state.text;
  $("#bg-colour").value = state.bg;
  $("#preview").style.color = state.text;
  $("#preview").style.background = state.bg;
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
  drawRows();
  drawHood();
  drawContrast();
}

$("#hsl-l").addEventListener("input", (event) => {
  state.hslL = Number(event.target.value);
  render();
});

$("#ok-l").addEventListener("input", (event) => {
  state.okL = Number(event.target.value);
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

for (const button of document.querySelectorAll(".preset")) {
  button.addEventListener("click", () => {
    state.text = button.dataset.text;
    state.bg = button.dataset.bg;
    render();
  });
}

render();

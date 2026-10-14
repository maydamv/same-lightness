import { hslToRgb, oklchToRgb, luminance, asGrey, rgbToHex } from "./colour.js";

// 12 hues around the colour wheel, one every 30°
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const OK_CHROMA = 0.12; // low enough that every hue fits on a screen

const state = {
  hslL: 50,  // HSL lightness, in %
  okL: 70,   // OKLCH lightness, in %
  picked: { model: "hsl", hue: 240 }, // the colour shown in "Under the hood"
};

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

function render() {
  drawRows();
}

$("#hsl-l").addEventListener("input", (event) => {
  state.hslL = Number(event.target.value);
  render();
});

$("#ok-l").addEventListener("input", (event) => {
  state.okL = Number(event.target.value);
  render();
});

render();

// The colour maths. A colour is an array [r, g, b], each channel from 0 to 1.

const clamp = (n) => Math.min(1, Math.max(0, n));

// HSL → sRGB. h in degrees (0–360), s and l from 0 to 1.
// This is the formula from the CSS spec. Notice it never looks at
// how bright each hue is: l is just the middle of the biggest and smallest channel.
export function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

// sRGB numbers are not "amount of light": screens store them with a curve (gamma)
// so dark tones get more precision. toLinear undoes the curve, fromLinear puts it back.
export function toLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function fromLinear(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

// How much light reaches the eye, from 0 (black) to 1 (white).
// The weights are how sensitive the eye is to each channel:
// green counts 10 times more than blue.
export const WEIGHTS = [0.2126, 0.7152, 0.0722];

export function luminance([r, g, b]) {
  return WEIGHTS[0] * toLinear(r) + WEIGHTS[1] * toLinear(g) + WEIGHTS[2] * toLinear(b);
}

// A grey that sends the same amount of light as the colour.
export function asGrey(rgb) {
  const grey = fromLinear(luminance(rgb));
  return [grey, grey, grey];
}

// WCAG contrast ratio: from 1 (same colour) to 21 (black on white).
// The 0.05 is a bit of light from the room that always reaches the screen.
export function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// OKLCH → sRGB. l from 0 to 1, c is the chroma (0 is grey), h in degrees.
// OKLCH was built so that the same l looks equally light for every hue.
// Matrices from Björn Ottosson, who designed OKLab: https://bottosson.github.io/posts/oklab/
export function oklchToRgb(l, c, h) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);

  // OKLab → the response of the three kinds of cone in the eye
  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  // cones → linear sRGB
  const r = 4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short;
  const g = -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short;
  const bl = -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short;

  // some OKLCH colours don't exist on a screen: clamp them to the nearest one
  return [r, g, bl].map((v) => clamp(fromLinear(v)));
}

// "#ff8800" → [1, 0.53, 0]
export function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

// [1, 0.53, 0] → "#ff8800"
export function rgbToHex(rgb) {
  return "#" + rgb.map((c) => Math.round(clamp(c) * 255).toString(16).padStart(2, "0")).join("");
}

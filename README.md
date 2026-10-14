# Same lightness?

Final project for Programming Interactivity, topic 7 · colour, perception.

> Two colours with the same HSL lightness don't look equally light. Why?

`hsl(60 100% 50%)` (yellow) and `hsl(240 100% 50%)` (blue) have the same
lightness, 50%. But yellow sends almost 13 times more light to your eye than
blue. HSL's lightness is only the middle point between the strongest and the
weakest RGB channel; it doesn't know that our eyes are much more sensitive to
green than to blue.

## What the page shows

1. **Same L, different light** · 12 hues with the same HSL lightness, and 12
   with the same OKLCH lightness. Under each colour, a grey with the same
   luminance. The HSL greys go from almost white to almost black; the OKLCH
   greys are all the same.
2. **Under the hood** · click any colour to see the luminance formula step by
   step: screen value → real light (gamma undone) → × the eye's weight → sum.
3. **Can you read it?** · a WCAG contrast checker. White on HSL yellow is
   1.07 : 1, white on HSL blue is 8.59 : 1: same lightness, opposite results.
4. **Not everyone sees the same colours** · repaints the whole page as someone
   with protanopia, deuteranopia, tritanopia or achromatopsia would see it.

## Run it

No build, no dependencies. Serve the folder (ES modules don't load from
`file://`):

```sh
npx live-server
# or
python -m http.server
```

## Files

```
index.html     the four sections
css/style.css  the styles
js/colour.js   the maths: HSL, OKLCH, luminance, contrast, colour blindness
js/main.js     the state, drawing each section, and the events
```

## The formulas

- **HSL → RGB**: CSS Color Module Level 4.
- **Relative luminance and contrast ratio**: WCAG 2.2,
  `L = 0.2126 R + 0.7152 G + 0.0722 B` on linear (gamma-undone) channels,
  `contrast = (L1 + 0.05) / (L2 + 0.05)`.
- **OKLCH → RGB**: Björn Ottosson, [A perceptual color space for image processing](https://bottosson.github.io/posts/oklab/).
- **Colour blindness**: Machado, Oliveira & Fernandes (2009), *A Physiologically-based
  Model for Simulation of Color Vision Deficiency*, severity 1.0.

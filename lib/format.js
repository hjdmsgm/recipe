const FRACTIONS = [
  [0.25, "¼"],
  [0.33, "⅓"],
  [0.34, "⅓"],
  [0.5, "½"],
  [0.66, "⅔"],
  [0.67, "⅔"],
  [0.75, "¾"],
];

export function scaleQuantity(quantity, baseServings, targetServings) {
  if (quantity == null) return null;
  if (!baseServings || baseServings <= 0) return quantity;
  return quantity * (targetServings / baseServings);
}

export function formatQuantity(value) {
  if (value == null) return "";
  const rounded = Math.round(value * 100) / 100;
  const whole = Math.floor(rounded);
  const frac = +(rounded - whole).toFixed(2);

  if (frac === 0) return `${whole}`;

  for (const [f, glyph] of FRACTIONS) {
    if (Math.abs(frac - f) <= 0.03) {
      return whole > 0 ? `${whole}${glyph}` : glyph;
    }
  }

  return `${Math.round(rounded * 100) / 100}`;
}

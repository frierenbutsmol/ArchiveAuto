// Adds thousands commas while the user types, so 5000 shows as 5,000.
// These only change what is shown in the text box. Before saving, strip the commas
// (e.g. text.replace(/[^0-9.]/g, '')) and parse the number, as the screens already do.

const withCommas = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// Whole numbers, such as an odometer: "5000" -> "5,000", "1234567" -> "1,234,567".
// maxDigits (optional) stops typing after that many digits, e.g. formatInteger(t, 6) caps at 999,999.
export function formatInteger(text, maxDigits = Infinity) {
  const digits = String(text ?? '').replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '').slice(0, maxDigits);
  return withCommas(digits);
}

// Money: whole part with commas, up to 2 decimals, and a trailing "." is kept while typing.
// "1500" -> "1,500", "1500.5" -> "1,500.5", ".5" -> "0.5", "12." -> "12."
export function formatMoney(text) {
  const clean = String(text ?? '').replace(/[^0-9.]/g, '');
  const dot = clean.indexOf('.');
  const whole = (dot === -1 ? clean : clean.slice(0, dot)).replace(/^0+(?=\d)/, '');
  if (dot === -1) return withCommas(whole);
  const decimals = clean.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  return `${withCommas(whole) || '0'}.${decimals}`;
}
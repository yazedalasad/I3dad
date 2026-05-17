export function normalizeIsraeliId(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length <= 9 ? digits.padStart(9, '0') : digits;
}

export function isValidIsraeliId(value) {
  const rawDigits = String(value || '').replace(/\D/g, '');
  if (!rawDigits || rawDigits.length > 9) return false;

  const id = normalizeIsraeliId(value);
  if (!/^\d{9}$/.test(id)) return false;
  if (id === '000000000') return false;

  const sum = id
    .split('')
    .map((digit, index) => {
      const n = Number(digit) * (index % 2 === 0 ? 1 : 2);
      return n > 9 ? n - 9 : n;
    })
    .reduce((a, b) => a + b, 0);

  return sum % 10 === 0;
}

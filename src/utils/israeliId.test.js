import { isValidIsraeliId, normalizeIsraeliId } from './israeliId';

describe('Israeli ID validation', () => {
  test('normalizes spaces and hyphens and pads to 9 digits', () => {
    expect(normalizeIsraeliId(' 12-345-678 ')).toBe('012345678');
    expect(normalizeIsraeliId('12345678')).toBe('012345678');
    expect(normalizeIsraeliId('12 345 678')).toBe('012345678');
    expect(normalizeIsraeliId('abc12-345-678xyz')).toBe('012345678');
  });

  test('does not trim or mask IDs longer than 9 digits', () => {
    expect(normalizeIsraeliId('1234567890')).toBe('1234567890');
    expect(normalizeIsraeliId('123-456-789-0')).toBe('1234567890');
  });

  test('accepts IDs with a valid checksum', () => {
    expect(isValidIsraeliId('123456782')).toBe(true);
    expect(isValidIsraeliId('000000018')).toBe(true);
    expect(isValidIsraeliId('123-456-782')).toBe(true);
  });

  test('rejects IDs with an invalid checksum or invalid length', () => {
    expect(isValidIsraeliId('')).toBe(false);
    expect(isValidIsraeliId('---')).toBe(false);
    expect(isValidIsraeliId('000000000')).toBe(false);
    expect(isValidIsraeliId('123456789')).toBe(false);
    expect(isValidIsraeliId('039213008')).toBe(false);
    expect(isValidIsraeliId('1234567890')).toBe(false);
    expect(isValidIsraeliId('12345678x9')).toBe(false);
  });
});

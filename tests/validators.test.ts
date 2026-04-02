import { describe, it, expect } from 'vitest';
import { validateInput } from '../src/utils/validators';

describe('validateInput', () => {
  it('accepts valid minimal input', () => {
    const result = validateInput({ searchQuery: 'bouw' });
    expect(result.searchQuery).toBe('bouw');
    expect(result.maxItems).toBe(100);
    expect(result.includeContactDetails).toBe(false);
    expect(result.location).toBeUndefined();
    expect(result.sectorCode).toBeUndefined();
  });

  it('throws when searchQuery is missing', () => {
    expect(() => validateInput({})).toThrow('searchQuery');
  });

  it('throws when searchQuery is not a string', () => {
    expect(() => validateInput({ searchQuery: 42 })).toThrow('searchQuery');
  });

  it('throws when maxItems is below 1', () => {
    expect(() => validateInput({ searchQuery: 'bouw', maxItems: 0 })).toThrow('maxItems');
  });

  it('throws when maxItems is above 10000', () => {
    expect(() => validateInput({ searchQuery: 'bouw', maxItems: 10001 })).toThrow('maxItems');
  });

  it('trims whitespace from searchQuery', () => {
    const result = validateInput({ searchQuery: '  bouw  ' });
    expect(result.searchQuery).toBe('bouw');
  });

  it('uses provided maxItems', () => {
    const result = validateInput({ searchQuery: 'bouw', maxItems: 500 });
    expect(result.maxItems).toBe(500);
  });

  it('sets includeContactDetails to true when provided', () => {
    const result = validateInput({ searchQuery: 'bouw', includeContactDetails: true });
    expect(result.includeContactDetails).toBe(true);
  });

  it('passes through location and sectorCode', () => {
    const result = validateInput({ searchQuery: 'bouw', location: 'Amsterdam', sectorCode: 'A01' });
    expect(result.location).toBe('Amsterdam');
    expect(result.sectorCode).toBe('A01');
  });
});

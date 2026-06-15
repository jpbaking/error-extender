import { describe, it, expect } from 'vitest';
import { isPlainObject, merge } from './merge';

describe('isPlainObject', () => {
  it('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it('returns false for non-plain values', () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(new Error())).toBe(false);
    expect(isPlainObject('string')).toBe(false);
    expect(isPlainObject(42)).toBe(false);
  });
});

describe('merge', () => {
  it('shallowly merges non-overlapping keys', () => {
    expect(merge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('later objects overwrite scalar values', () => {
    expect(merge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  it('deeply merges nested plain objects', () => {
    expect(
      merge({ a: { x: 1, y: 2 } }, { a: { y: 99, z: 3 } })
    ).toEqual({ a: { x: 1, y: 99, z: 3 } });
  });

  it('merges more than two objects left-to-right', () => {
    expect(merge({ a: 1 }, { b: 2 }, { a: 9, c: 3 })).toEqual({ a: 9, b: 2, c: 3 });
  });
});

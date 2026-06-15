import { describe, it, expect } from 'vitest';
import { hiddenReadOnly } from './hidden-readonly';

describe('hiddenReadOnly', () => {
  it('hides the property from JSON serialization', () => {
    const obj: Record<string, unknown> = {};
    hiddenReadOnly(obj, 'greeting', 'Hello World!');
    expect(obj.greeting).toBe('Hello World!');
    expect(JSON.parse(JSON.stringify(obj)).greeting).toBeUndefined();
  });

  it('makes the property non-writable', () => {
    const obj: Record<string, unknown> = {};
    hiddenReadOnly(obj, 'greeting', 'Hello World!');
    expect(() => {
      'use strict';
      obj.greeting = 'changed';
    }).toThrow();
  });
});

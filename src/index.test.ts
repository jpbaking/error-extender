import { describe, it, expect } from 'vitest';
import { extendError } from './index';
import { hiddenReadOnly } from './helpers/hidden-readonly';

describe('extendError', () => {
  it('sets the error name', () => {
    const NError = extendError('NError');
    expect(NError.name).toBe('NError');
    expect(NError.prototype.name).toBe('NError');
    expect(new NError().name).toBe('NError');
  });

  it('produces instances that are instanceof Error', () => {
    const NError = extendError('NError');
    expect(new NError()).toBeInstanceOf(Error);
  });

  it('applies defaultMessage and defaultData', () => {
    const NError = extendError('NError', {
      defaultMessage: 'default message',
      defaultData: 'default data',
    });
    expect(NError.defaultMessage).toBe('default message');
    expect(NError.defaultData).toBe('default data');
    expect(new NError().message).toBe('default message');
    expect(new NError().data).toBe('default data');
  });

  it('extends a parent error', () => {
    const NError = extendError('NError');
    const SError = extendError('SError', { parent: NError });
    expect(new SError()).toBeInstanceOf(NError);
    expect(new SError()).toBeInstanceOf(Error);
  });

  it('overrides message via constructor options (m alias)', () => {
    const NError = extendError('NError', { defaultMessage: 'default message' });
    expect(new NError().message).toBe('default message');
    expect(new NError({ m: 'the message' }).message).toBe('the message');
    expect(new NError({ message: 'also works' }).message).toBe('also works');
  });

  it('sets data, merging with defaultData when both are plain objects', () => {
    const NError = extendError('NError', {
      defaultData: { status: 400, body: { status: 'fail', data: { username: 'cannot be blank' } } },
    });
    const SError = extendError('SError', {
      parent: NError,
      defaultData: { status: 404, body: { data: { username: 'not found' } } },
    });

    expect(new NError({ d: 'scalar' }).data).toBe('scalar');
    expect(new NError({ data: { status: 404, body: { status: 'error' } } }).data).toEqual({
      status: 404,
      body: { status: 'error', data: { username: 'cannot be blank' } },
    });
    expect(new SError().data).toEqual({
      status: 404,
      body: { status: 'fail', data: { username: 'not found' } },
    });
  });

  it('attaches cause and appends its stack', () => {
    const NError = extendError('NError');
    const SError = extendError('SError', { parent: NError });

    const root = new Error('the root error');
    const first = new SError({ c: root, message: 'first wrapper' });
    const last = new NError({ cause: first, message: 'last wrapper' });

    expect(last.message).toBe('last wrapper');
    expect(last.cause?.message).toBe('first wrapper');
    expect((last.cause as typeof first).cause?.message).toBe('the root error');

    const firstParts = first.stack!.split('Caused by: ');
    expect(firstParts).toHaveLength(2);
    expect(firstParts[0].split('\n')[0]).toBe('SError: first wrapper');
    expect(firstParts[1].split('\n')[0]).toBe('Error: the root error');

    const lastParts = last.stack!.split('Caused by: ');
    expect(lastParts).toHaveLength(3);
    expect(lastParts[0].split('\n')[0]).toBe('NError: last wrapper');
    expect(lastParts[1].split('\n')[0]).toBe('SError: first wrapper');
    expect(lastParts[2].split('\n')[0]).toBe('Error: the root error');
  });

  it('handles causes without a stack', () => {
    const NError = extendError('NError');
    const root = new Error('the root error');
    hiddenReadOnly(root, 'stack', undefined);

    const wrapped = new NError({ c: root, message: 'wrapper' });
    const parts = wrapped.stack!.split('Caused by: ');
    expect(parts).toHaveLength(2);
    expect(parts[0].split('\n')[0]).toBe('NError: wrapper');
    expect(parts[1]).toBe('Error: the root error');
  });

  it('throws when name is blank', () => {
    expect(() => extendError('')).toThrow(TypeError);
    expect(() => extendError('  ')).toThrow(TypeError);
  });

  it('throws when parent is not an Error constructor', () => {
    expect(() => extendError('X', { parent: Date as unknown as new () => Error })).toThrow(TypeError);
  });

  it('throws when cause is not an Error instance', () => {
    const NError = extendError('NError');
    expect(() => new NError({ cause: 'oops' as unknown as Error })).toThrow(TypeError);
  });
});

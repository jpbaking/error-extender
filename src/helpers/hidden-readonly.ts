export function hiddenReadOnly(obj: object, key: string, value: unknown): void {
  Object.defineProperty(obj, key, {
    value,
    enumerable: false,
    writable: false,
    configurable: false,
  });
}

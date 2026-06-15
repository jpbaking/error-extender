export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && (value as object).constructor === Object;
}

export function merge(
  ...objects: Record<string, unknown>[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const obj of objects) {
    for (const key of Object.keys(obj)) {
      const existing = result[key];
      const incoming = obj[key];
      if (isPlainObject(existing) && isPlainObject(incoming)) {
        result[key] = merge(existing, incoming);
      } else {
        result[key] = incoming;
      }
    }
  }
  return result;
}

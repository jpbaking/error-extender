export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && (value as object).constructor === Object;
}

export function merge(
  ...objects: Record<string, unknown>[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const obj of objects) {
    for (const key of Object.keys(obj)) {
      if (isPlainObject(result[key]) && isPlainObject(obj[key])) {
        result[key] = merge(
          result[key] as Record<string, unknown>,
          obj[key] as Record<string, unknown>
        );
      } else {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

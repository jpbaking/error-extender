import { hiddenReadOnly } from './helpers/hidden-readonly';
import { isPlainObject, merge } from './helpers/merge';

export interface ExtendOptions<TData = unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent?: new (...args: any[]) => Error;
  defaultMessage?: string;
  defaultData?: TData;
}

export interface ErrorConstructorOptions<TData = unknown> {
  message?: string;
  /** Alias for `message` */
  m?: string;
  data?: TData;
  /** Alias for `data` */
  d?: TData;
  cause?: Error;
  /** Alias for `cause` */
  c?: Error;
}

export interface ExtendedError<TData = unknown> extends Error {
  readonly data?: TData;
  readonly cause?: Error;
}

export interface ExtendedErrorConstructor<TData = unknown> {
  new (options?: ErrorConstructorOptions<TData>): ExtendedError<TData>;
  readonly defaultMessage?: string;
  readonly defaultData?: TData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyErrorConstructor = new (...args: any[]) => Error;

export function extendError<TData = unknown>(
  name: string,
  options: ExtendOptions<TData> = {}
): ExtendedErrorConstructor<TData> {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('`name` must be a non-blank string');
  }

  const Parent: AnyErrorConstructor = options.parent ?? Error;
  if (Parent !== Error && !(Parent.prototype instanceof Error)) {
    throw new TypeError('`options.parent` must be an Error constructor');
  }

  // Resolve defaultMessage: use child's if provided, else inherit parent's
  const parentDefaultMessage = (Parent as { defaultMessage?: string }).defaultMessage;
  const defaultMessage =
    typeof options.defaultMessage === 'string' && options.defaultMessage.trim()
      ? options.defaultMessage
      : parentDefaultMessage;

  // Resolve defaultData: deep-merge with parent's if both are plain objects
  const parentDefaultData = (Parent as { defaultData?: TData }).defaultData;
  const defaultData: TData | undefined =
    isPlainObject(options.defaultData) && isPlainObject(parentDefaultData)
      ? (merge(
          parentDefaultData as Record<string, unknown>,
          options.defaultData as Record<string, unknown>
        ) as TData)
      : options.defaultData;

  function ExtendedErrorImpl(
    this: ExtendedError<TData>,
    opts: ErrorConstructorOptions<TData> = {}
  ): void {
    Error.captureStackTrace(this, ExtendedErrorImpl);

    const msg = opts.m || opts.message || defaultMessage;
    hiddenReadOnly(this, 'message', msg ?? '');

    const rawData = opts.d ?? opts.data;
    let resolvedData: TData | undefined;
    if (isPlainObject(rawData) && isPlainObject(defaultData)) {
      resolvedData = merge(
        defaultData as Record<string, unknown>,
        rawData as Record<string, unknown>
      ) as TData;
    } else if (rawData !== undefined) {
      resolvedData = rawData as TData;
    } else {
      resolvedData = defaultData;
    }
    hiddenReadOnly(this, 'data', resolvedData);

    const cause = opts.c ?? opts.cause;
    if (cause !== undefined) {
      if (!(cause instanceof Error)) {
        throw new TypeError('`cause` must be a valid Error instance');
      }
      hiddenReadOnly(this, 'cause', cause);
      const causedBy = cause.stack ?? cause.toString();
      hiddenReadOnly(this, 'stack', `${this.stack}\nCaused by: ${causedBy}`);
    }
  }

  // Wire up prototype chain without calling the parent constructor
  ExtendedErrorImpl.prototype = Object.create(
    (Parent as { prototype: Error }).prototype
  );
  ExtendedErrorImpl.prototype.constructor = ExtendedErrorImpl;

  Object.defineProperty(ExtendedErrorImpl, 'name', { value: name, configurable: true });
  Object.defineProperty(ExtendedErrorImpl.prototype, 'name', {
    value: name,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(ExtendedErrorImpl, 'defaultMessage', {
    value: defaultMessage,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(ExtendedErrorImpl, 'defaultData', {
    value: defaultData,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  return ExtendedErrorImpl as unknown as ExtendedErrorConstructor<TData>;
}

export default extendError;

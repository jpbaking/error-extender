# error-extender

Simplifies creation of custom `Error` classes for Node.js, with cause-chaining stack traces (à la Java) and deep-merging defaults.

## Why error-extender?

Modern JavaScript has `Error.cause` and class-based custom errors — but there are real gaps that `error-extender` fills.

### Cause chains appear in logs without any custom formatter

Most loggers (Winston, Pino, etc.) and log aggregators serialize only `error.stack`. Native `Error.cause` is invisible to them unless you write a custom serializer for every tool in your pipeline. `error-extender` appends each `Caused by:` frame directly into the stack string, so the full chain appears wherever stack traces are written — no extra setup.

```javascript
// Native — cause is invisible in error.stack
const root = new Error('connection refused');
const err = new Error('query failed', { cause: root });
console.error(err.stack);
// Error: query failed
//     at Object.<anonymous> (/app/index.js:2:13)
//     ...
// (cause never appears — most loggers stop here)

// error-extender — full chain baked into the stack string
const { extendError } = require('error-extender');
const DatabaseError = extendError('DatabaseError');

const root = new Error('connection refused');
const err = new DatabaseError({ message: 'query failed', cause: root });
console.error(err.stack);
// DatabaseError: query failed
//     at Object.<anonymous> (/app/index.js:8:13)
//     ...
// Caused by: Error: connection refused
//     at Object.<anonymous> (/app/index.js:7:14)
//     ...
```

### Typed, structured context on every error

Native `Error` has no `data` field. Without `error-extender`, attaching structured context (an HTTP status, a request ID, an affected resource) requires manual boilerplate on every custom class.

```typescript
// Native — boilerplate repeated on every custom error class
class HttpError extends Error {
  readonly status: number;
  readonly body?: string;
  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

// error-extender — typed data in one call, no boilerplate
import { extendError } from 'error-extender';

interface HttpErrorData { status: number; body?: string }

const HttpError = extendError<HttpErrorData>('HttpError');

const err = new HttpError({ data: { status: 404, body: 'Not Found' } });
err.data?.status; // number — fully typed
```

### Default values cascade and deep-merge down the hierarchy

Define `defaultMessage` and `defaultData` once at the parent level; child errors inherit them automatically. When both parent and child `defaultData` are plain objects, they deep-merge (child wins on conflict) — so a `DatabaseError` can inherit `{ status: 500 }` from `ServiceError` and only override what it needs.

```typescript
import { extendError } from 'error-extender';

const ServiceError = extendError('ServiceError', {
  defaultMessage: 'A service error has occurred.',
  defaultData: { status: 500 },
});

const DatabaseError = extendError('DatabaseError', {
  parent: ServiceError,
  // no defaultMessage — inherits from ServiceError
  defaultData: { message: 'A database error has occurred.' },
});

console.log(DatabaseError.defaultData);
// { status: 500, message: 'A database error has occurred.' }
//   ^^ status inherited from ServiceError, message added by DatabaseError

const err = new DatabaseError(); // no args needed
console.log(err.message); // 'A service error has occurred.'  (inherited)
console.log(err.data);    // { status: 500, message: 'A database error has occurred.' }
```

### Stack traces point at your code, not library internals

`error-extender` uses `Error.captureStackTrace` to remove its own frames from the stack, so every trace starts at the call site in your application.

```
// Without captureStackTrace — library internals pollute the top of the stack
Error: something went wrong
    at new ExtendedErrorImpl (node_modules/error-extender/dist/index.js:18:5)
    at Object.<anonymous> (/app/service.js:12:9)   <-- your code, buried
    ...

// error-extender — trace starts directly at your call site
ServiceError: something went wrong
    at Object.<anonymous> (/app/service.js:12:9)   <-- your code, first
    ...
```

## Install

```sh
npm install error-extender
```

## Quick Start

**TypeScript**

```typescript
import { extendError } from 'error-extender';

const CustomError = extendError('CustomError');

const rootCause = new Error('something broke deep down');

throw new CustomError({ message: 'An error has occurred.', cause: rootCause });
```

**Plain JS (CommonJS)**

```javascript
const { extendError } = require('error-extender');

const CustomError = extendError('CustomError');

const rootCause = new Error('something broke deep down');

throw new CustomError({ message: 'An error has occurred.', cause: rootCause });
```

The thrown error's `.stack` will include the full cause chain:

```
CustomError: An error has occurred.
    at Object.<anonymous> (/opt/app/index.js:7:7)
    ...
Caused by: Error: something broke deep down
    at Object.<anonymous> (/opt/app/index.js:5:19)
    ...
```

## Features

### Creating Custom Error Classes

```typescript
// TypeScript
import { extendError } from 'error-extender';

const AppError = extendError('AppError');
```

```javascript
// Plain JS
const { extendError } = require('error-extender');

const AppError = extendError('AppError');
```

The second argument accepts options:

| key              | type                                     | description                              |
| ---------------- | ---------------------------------------- | ---------------------------------------- |
| `parent`         | `Error` constructor _(or subclass of it)_ | Parent error class to extend (default: `Error`) |
| `defaultMessage` | `string`                                 | Fallback message when none is provided   |
| `defaultData`    | `any`                                    | Fallback data (deep-merged with instance `data` if both are plain objects) |

### Error Hierarchies

Custom errors can extend other custom errors. `instanceof` checks work across the full hierarchy.

```typescript
// TypeScript
import { extendError } from 'error-extender';

const AppError    = extendError('AppError');
const ServiceError = extendError('ServiceError', { parent: AppError });
const DatabaseError = extendError('DatabaseError', { parent: ServiceError });

const err = new DatabaseError();
console.log(err instanceof DatabaseError); // true
console.log(err instanceof ServiceError);  // true
console.log(err instanceof AppError);      // true
console.log(err instanceof Error);         // true
```

```javascript
// Plain JS
const { extendError } = require('error-extender');

const AppError     = extendError('AppError');
const ServiceError = extendError('ServiceError', { parent: AppError });
const DatabaseError = extendError('DatabaseError', { parent: ServiceError });

const err = new DatabaseError();
console.log(err instanceof DatabaseError); // true
console.log(err instanceof ServiceError);  // true
console.log(err instanceof AppError);      // true
console.log(err instanceof Error);         // true
```

### Default Message & Data Inheritance

`defaultMessage` and `defaultData` cascade down the hierarchy. Children inherit parent defaults and can override or extend them.

```typescript
// TypeScript
import { extendError } from 'error-extender';

const AppError = extendError('AppError', {
  defaultMessage: 'An unhandled error has occurred.',
  defaultData: { status: 503, message: 'Service unavailable.' },
});

const ServiceError = extendError('ServiceError', {
  parent: AppError,
  defaultMessage: 'A service error has occurred.',
  defaultData: { status: 500, message: 'Internal server error.' },
});

const DatabaseError = extendError('DatabaseError', {
  parent: ServiceError,
  // no defaultMessage — inherits ServiceError's
  defaultData: { message: 'A database error has occurred.' },
});

console.log(DatabaseError.defaultData);
// { status: 500, message: 'A database error has occurred.' }
//   ^^ status inherited from ServiceError, message overridden
```

```javascript
// Plain JS
const { extendError } = require('error-extender');

const AppError = extendError('AppError', {
  defaultMessage: 'An unhandled error has occurred.',
  defaultData: { status: 503, message: 'Service unavailable.' },
});

const ServiceError = extendError('ServiceError', {
  parent: AppError,
  defaultMessage: 'A service error has occurred.',
  defaultData: { status: 500, message: 'Internal server error.' },
});

const DatabaseError = extendError('DatabaseError', {
  parent: ServiceError,
  defaultData: { message: 'A database error has occurred.' },
});

console.log(DatabaseError.defaultData);
// { status: 500, message: 'A database error has occurred.' }
```

### Constructor Options

Custom errors accept a single options object:

| key       | alias | type                | description                      |
| :-------- | :---: | ------------------- | -------------------------------- |
| `message` | `m`   | `string`            | Error message                    |
| `data`    | `d`   | `any`               | Arbitrary attached data          |
| `cause`   | `c`   | `instanceof Error`  | The underlying cause             |

Aliases (`m`, `d`, `c`) are evaluated first; if `m` is truthy it takes precedence over `message`.

```typescript
// TypeScript
import { extendError } from 'error-extender';

const ServiceError = extendError('ServiceError');

try {
  // ...something that throws
} catch (err) {
  throw new ServiceError({
    message: 'Failed to call downstream service.',
    data: { ref: '7e9f876ca116' },
    cause: err as Error,
  });
}
```

```javascript
// Plain JS
const { extendError } = require('error-extender');

const ServiceError = extendError('ServiceError');

try {
  // ...something that throws
} catch (err) {
  throw new ServiceError({
    message: 'Failed to call downstream service.',
    data: { ref: '7e9f876ca116' },
    cause: err,
  });
}
```

### Instance Properties

In addition to the standard `name`, `message`, and `stack`:

| property | description                              |
| -------- | ---------------------------------------- |
| `data`   | The resolved data (instance `data` deep-merged with `defaultData` when both are plain objects) |
| `cause`  | The causing `Error` instance             |

### Instance `data` Merges with `defaultData`

When both `defaultData` and the instance `data` are plain objects, they are deep-merged (instance values win on conflict).

```typescript
// TypeScript
import { extendError } from 'error-extender';

const AppError = extendError('AppError', {
  defaultData: { status: 503, message: 'Service unavailable.' },
});

const err = new AppError({ data: { status: 401 } });

console.log(err.data);
// { status: 401, message: 'Service unavailable.' }
//   ^^ status overridden, message filled from defaultData
```

```javascript
// Plain JS
const { extendError } = require('error-extender');

const AppError = extendError('AppError', {
  defaultData: { status: 503, message: 'Service unavailable.' },
});

const err = new AppError({ data: { status: 401 } });

console.log(err.data);
// { status: 401, message: 'Service unavailable.' }
```

### Cause Chain in Stack Traces

Each `Caused by:` section appends the full stack of the causing error, arbitrarily deep.

```typescript
// TypeScript
import { extendError } from 'error-extender';

const ServiceError  = extendError('ServiceError');
const DatabaseError = extendError('DatabaseError', { parent: ServiceError });

try {
  try {
    throw new Error('connection refused');
  } catch (root) {
    throw new DatabaseError({ message: 'Query failed.', cause: root as Error });
  }
} catch (dbErr) {
  throw new ServiceError({ message: 'Could not load user.', cause: dbErr as Error });
}
```

```javascript
// Plain JS
const { extendError } = require('error-extender');

const ServiceError  = extendError('ServiceError');
const DatabaseError = extendError('DatabaseError', { parent: ServiceError });

try {
  try {
    throw new Error('connection refused');
  } catch (root) {
    throw new DatabaseError({ message: 'Query failed.', cause: root });
  }
} catch (dbErr) {
  throw new ServiceError({ message: 'Could not load user.', cause: dbErr });
}
```

Stack trace output:

```
ServiceError: Could not load user.
    at Object.<anonymous> (/opt/app/index.js:14:9)
    ...
Caused by: DatabaseError: Query failed.
    at Object.<anonymous> (/opt/app/index.js:10:11)
    ...
Caused by: Error: connection refused
    at Object.<anonymous> (/opt/app/index.js:7:11)
    ...
```

### TypeScript: Typed `data`

Pass a type parameter to get full type safety on `data` and `defaultData`.

```typescript
import { extendError } from 'error-extender';

interface HttpErrorData {
  status: number;
  body?: string;
}

const HttpError = extendError<HttpErrorData>('HttpError', {
  defaultData: { status: 500 },
});

const err = new HttpError({ data: { status: 404, body: 'Not Found' } });

console.log(err.data?.status); // 404  (typed as HttpErrorData)
```

## 100% Code Coverage

Test coverage is verified on every build via `npm test`.

## License

### Zero-Clause BSD License (0BSD)

#### Copyright (c) 2018 Joseph Baking

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.

**THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.**

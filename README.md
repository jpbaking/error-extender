# error-extender

Simplifies creation of custom `Error` classes for Node.js, with cause-chaining stack traces (à la Java) and deep-merging defaults.

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

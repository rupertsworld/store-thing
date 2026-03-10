# store-thing

A reactive store backed by `localStorage` or `sessionStorage`, with [Immer](https://immerjs.github.io/immer/)-powered immutable updates and event-based subscriptions.

## Install

```bash
npm install store-thing
```

## Usage

```typescript
import { Store } from 'store-thing';

type CounterState = {
  count: number;
};

const initialState: CounterState = { count: 0 };
const store = new Store<CounterState>('counter', initialState);

// Listen for change events
const changeListener = store.on('change', (state) => {
  console.log('Count:', state.count);
});

// Subscribe shorthand (immediate call + future changes)
const subscription = store.subscribe((state) => {
  console.log('Immediate + updates:', state.count);
});
// → logs immediately with current state

// Update with Immer-style mutations
store.update((state) => {
  state.count += 1;
});
// → logs "Count: 1"

// Read current value
store.get(); // { count: 1 }

// Reset to initial value
store.reset();
// → logs "Count: 0"

// Stop listening
changeListener.dispose();
subscription.dispose();
```

## API

```typescript
export type StorageType = 'local' | 'session';

export interface StoreOptions {
  storage?: StorageType;
}

export type { Disposable } from '@rupertsworld/emitter';

export class Store<T> {
  constructor(id: string, initValue: T, options?: StoreOptions);
  get(): T | undefined;
  update(mutation: (draft: T) => void): void;
  reset(): void;
  on(type: 'change', handler: (state: T) => void): Disposable;
  subscribe(callback: (state: T) => void): Disposable;
}
```

### `new Store<T>(id, initValue, options?)`

Creates a new store instance.

| Parameter   | Type           | Description                                                       |
| ----------- | -------------- | ----------------------------------------------------------------- |
| `id`        | `string`       | Unique identifier. Stored under the key `store-{id}` in storage.  |
| `initValue` | `T`            | The initial value. Only written if no existing value is found.     |
| `options`   | `StoreOptions` | Optional. `{ storage: 'local' | 'session' }`. Defaults to `local`.|

### `store.get(): T | undefined`

Returns the current value from storage, or `undefined` if the key has been removed.

### `store.update(mutation: (draft: T) => void): void`

Applies an [Immer](https://immerjs.github.io/immer/) mutation to the current state, persists the result, and notifies subscribers.

```typescript
store.update((draft) => {
  draft.items.push({ id: 1, name: 'New item' });
});
```

### `store.reset(): void`

Restores the store to its initial value and notifies subscribers.

### `store.on('change', callback: (state: T) => void): Disposable`

Registers a callback for state changes. The callback receives the latest state.

```typescript
const listener = store.on('change', (state) => {
  renderUI(state);
});

listener.dispose();
```

### `store.subscribe(callback: (state: T) => void): Disposable`

Shorthand for subscribing to `change` that also fires immediately with the current state. Returns a `Disposable`.

```typescript
const sub = store.subscribe((state) => {
  renderUI(state);
});

// Later:
sub.dispose();
```

## Storage

Values are serialized as JSON and stored under the key `store-{id}`. By default, `localStorage` is used. Pass `{ storage: 'session' }` to use `sessionStorage` instead.

If a value already exists in storage when the `Store` is constructed, it is preserved — the `initValue` is only written on first use.

## Development

```bash
npm install
npm test          # run tests once
npm run test:dist # build and test published dist entrypoints (ESM + CJS)
npm run test:watch # run tests in watch mode
npm run typecheck  # type-check without emitting
npm run build      # build with tsup (ESM + CJS + .d.ts)
```

## License

MIT

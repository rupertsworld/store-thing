import { produce } from 'immer';
import { Emitter } from '@rupertsworld/emitter';
import type { Disposable } from '@rupertsworld/emitter';

export type { Disposable } from '@rupertsworld/emitter';

const STORAGE_PREFIX = 'store-';

export type StorageType = 'local' | 'session';

export interface StoreOptions {
  storage?: StorageType;
}

export interface StoreEvents<T> {
  change: { state: T };
}

class StoreEmitter<T> extends Emitter<StoreEvents<T>> {
  emitChange(state: T): void {
    this.emit('change', { state });
  }
}

export class Store<T> {
  readonly id: string;
  readonly key: string;
  private readonly initValue: T;
  private readonly storage: Storage;
  private readonly emitter = new StoreEmitter<T>();

  constructor(id: string, initValue: T, options?: StoreOptions) {
    this.id = id;
    this.initValue = initValue;
    this.key = `${STORAGE_PREFIX}${id}`;
    this.storage =
      options?.storage === 'session' ? sessionStorage : localStorage;

    if (this.get() === undefined) {
      this.storage.setItem(this.key, JSON.stringify(initValue));
    }
  }

  get(): T | undefined {
    const raw = this.storage.getItem(this.key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  }

  update(mutation: (draft: T) => void): void {
    const current = this.get() ?? ({} as T);
    const next = produce(current, mutation);
    this.storage.setItem(this.key, JSON.stringify(next));
    this.emitter.emitChange(next);
  }

  reset(): void {
    this.storage.setItem(this.key, JSON.stringify(this.initValue));
    this.emitter.emitChange(this.initValue);
  }

  on(type: 'change', handler: (state: T) => void): Disposable {
    return this.emitter.on(type, ({ state }) => handler(state));
  }

  subscribe(callback: (state: T) => void): Disposable {
    const sub = this.on('change', callback);
    const state = this.get();
    if (state !== undefined) callback(state);
    return sub;
  }
}

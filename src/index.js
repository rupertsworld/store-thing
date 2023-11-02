import { produce } from 'immer';

const storagePrefix = 'store-';

export class Store {
  constructor(id, initValue, options) {
    this.id = id;
    this.initValue = initValue;
    this.key = `${storagePrefix}${id}`;

    if (options && options.storage && options.storage === 'session') {
      this.storage = sessionStorage;
    } else if (options && options.storage && options.storage === 'local') {
      this.storage = localStorage;
    } else {
      this.storage = localStorage;
    }
    if (!this.get()) {
      this.storage.setItem(this.key, JSON.stringify(initValue));
      const event = new CustomEvent(this.key);
      dispatchEvent(event);
    }
  }

  reset() {
    this.storage.setItem(this.id, this.initValue);
  }

  update(mutation) {
    const currentState = this.get() ?? {};
    const baseState = { ...currentState };
    const newState = produce(baseState, (draft) => {
      mutation(draft);
    });
    this.storage.setItem(this.key, JSON.stringify(newState));
    const event = new CustomEvent(this.key);
    dispatchEvent(event);
  }

  get() {
    const value = this.storage.getItem(this.key);
    return value ? JSON.parse(value) : undefined;
  }

  subscribe(callback) {
    addEventListener(`${storagePrefix}${this.id}`, () => {
      const store = this.get();
      callback(store);
    });
    const store = this.get();
    callback(store);
  }
}

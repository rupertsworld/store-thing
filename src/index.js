import { produce } from 'immer';

export class Store {
  constructor(id, initValue, options) {
    this.id = id;
    if (this.get() && options.persist) return;
    localStorage.setItem(this.id, JSON.stringify(initValue));
    const event = new CustomEvent(`gs-${this.id}`);
    dispatchEvent(event);
  }

  update(mutation) {
    const currentState = this.get() ?? {};
    const baseState = { ...currentState };
    const newState = produce(baseState, (draft) => {
      mutation(draft);
    });
    localStorage.setItem(this.id, JSON.stringify(newState));
    const event = new CustomEvent(`gs-${this.id}`);
    dispatchEvent(event);
  }

  get() {
    const value = localStorage.getItem(this.id);
    return value ? JSON.parse(value) : undefined;
  }

  subscribe(callback) {
    addEventListener(`gs-${this.id}`, () => {
      const store = this.get();
      callback(store);
    });
    const store = this.get();
    callback(store);
  }
}

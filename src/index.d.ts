export declare class Store<T> {
  id: string;
  constructor(
    id: string,
    initValue: T,
    options: { storage: 'local' | 'session' }
  );
  update(mutation: (state: T) => void): void;
  get(): T;
  subscribe(callback: (state: T) => void): void;
}

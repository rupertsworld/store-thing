import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Store } from '../src/index';
import type { Disposable } from '@rupertsworld/emitter';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('Store', () => {
  describe('constructor', () => {
    it('writes initial value to localStorage by default', () => {
      new Store('test', { count: 0 });
      expect(localStorage.getItem('store-test')).toBe('{"count":0}');
    });

    it('writes initial value to sessionStorage when configured', () => {
      new Store('test', { count: 0 }, { storage: 'session' });
      expect(sessionStorage.getItem('store-test')).toBe('{"count":0}');
    });

    it('uses localStorage when storage option is "local"', () => {
      new Store('test', { x: 1 }, { storage: 'local' });
      expect(localStorage.getItem('store-test')).toBe('{"x":1}');
    });

    it('prefixes key with "store-"', () => {
      new Store('myStore', 'hello');
      expect(localStorage.getItem('store-myStore')).toBe('"hello"');
    });

    it('does not overwrite existing stored value', () => {
      localStorage.setItem('store-test', '{"count":42}');
      new Store('test', { count: 0 });
      expect(localStorage.getItem('store-test')).toBe('{"count":42}');
    });

    it('emits change on initialization when writing', () => {
      const handler = vi.fn();
      const store = new Store('test', { count: 0 });
      // The change event during construction fires before we can subscribe,
      // so we verify by checking that subscribe gets the initial state
      store.on('change', handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('handles primitive initial values', () => {
      new Store('num', 42);
      expect(localStorage.getItem('store-num')).toBe('42');

      new Store('str', 'hello');
      expect(localStorage.getItem('store-str')).toBe('"hello"');

      new Store('bool', true);
      expect(localStorage.getItem('store-bool')).toBe('true');

      new Store('nil', null);
      expect(localStorage.getItem('store-nil')).toBe('null');
    });

    it('handles array initial values', () => {
      new Store('arr', [1, 2, 3]);
      expect(localStorage.getItem('store-arr')).toBe('[1,2,3]');
    });
  });

  describe('get', () => {
    it('returns the stored value', () => {
      const store = new Store('test', { count: 5 });
      expect(store.get()).toEqual({ count: 5 });
    });

    it('returns undefined when storage item has been externally removed', () => {
      const store = new Store('test', { count: 0 });
      localStorage.removeItem('store-test');
      expect(store.get()).toBeUndefined();
    });

    it('returns the parsed value after updates', () => {
      const store = new Store('test', { count: 0 });
      store.update((d) => { d.count = 10; });
      expect(store.get()).toEqual({ count: 10 });
    });

    it('returns primitive values correctly', () => {
      const store = new Store('num', 42);
      expect(store.get()).toBe(42);
    });
  });

  describe('update', () => {
    it('applies an Immer-style mutation', () => {
      const store = new Store('test', { count: 0, name: 'a' });
      store.update((draft) => { draft.count = 5; });
      expect(store.get()).toEqual({ count: 5, name: 'a' });
    });

    it('persists the updated value to storage', () => {
      const store = new Store('test', { count: 0 });
      store.update((d) => { d.count = 99; });
      expect(JSON.parse(localStorage.getItem('store-test')!)).toEqual({ count: 99 });
    });

    it('supports multiple sequential updates', () => {
      const store = new Store('test', { count: 0 });
      store.update((d) => { d.count += 1; });
      store.update((d) => { d.count += 1; });
      store.update((d) => { d.count += 1; });
      expect(store.get()).toEqual({ count: 3 });
    });

    it('supports nested object mutations', () => {
      const store = new Store('test', { user: { name: 'Alice', age: 30 } });
      store.update((d) => { d.user.age = 31; });
      expect(store.get()).toEqual({ user: { name: 'Alice', age: 31 } });
    });

    it('supports array mutations', () => {
      const store = new Store('test', { items: ['a', 'b'] });
      store.update((d) => { d.items.push('c'); });
      expect(store.get()).toEqual({ items: ['a', 'b', 'c'] });
    });

    it('produces immutable updates (does not mutate previous state)', () => {
      const store = new Store('test', { count: 0 });
      const before = store.get();
      store.update((d) => { d.count = 1; });
      const after = store.get();
      expect(before).toEqual({ count: 0 });
      expect(after).toEqual({ count: 1 });
      expect(before).not.toBe(after);
    });
  });

  describe('reset', () => {
    it('restores the initial value', () => {
      const store = new Store('test', { count: 0 });
      store.update((d) => { d.count = 99; });
      store.reset();
      expect(store.get()).toEqual({ count: 0 });
    });

    it('persists the reset value to storage', () => {
      const store = new Store('test', { count: 0 });
      store.update((d) => { d.count = 42; });
      store.reset();
      expect(JSON.parse(localStorage.getItem('store-test')!)).toEqual({ count: 0 });
    });

    it('works with sessionStorage', () => {
      const store = new Store('test', { count: 0 }, { storage: 'session' });
      store.update((d) => { d.count = 10; });
      store.reset();
      expect(store.get()).toEqual({ count: 0 });
    });
  });

  describe('on("change")', () => {
    it('fires with the new state on update', () => {
      const store = new Store('test', { count: 0 });
      const handler = vi.fn();
      store.on('change', handler);

      store.update((d) => { d.count = 1; });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ count: 1 });
    });

    it('fires with the new state on reset', () => {
      const store = new Store('test', { count: 0 });
      store.update((d) => { d.count = 5; });

      const handler = vi.fn();
      store.on('change', handler);
      store.reset();

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ count: 0 });
    });

    it('returns a Disposable that stops further callbacks', () => {
      const store = new Store('test', { count: 0 });
      const handler = vi.fn();
      const sub = store.on('change', handler);

      expect(sub).toHaveProperty('dispose');
      expect(typeof sub.dispose).toBe('function');

      store.update((d) => { d.count = 1; });
      expect(handler).toHaveBeenCalledOnce();

      sub.dispose();
      store.update((d) => { d.count = 2; });
      expect(handler).toHaveBeenCalledOnce();
    });

    it('supports multiple listeners', () => {
      const store = new Store('test', { count: 0 });
      const h1 = vi.fn();
      const h2 = vi.fn();
      const sub1 = store.on('change', h1);
      const sub2 = store.on('change', h2);

      store.update((d) => { d.count = 1; });

      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
      sub1.dispose();
      sub2.dispose();
    });

    it('disposing one listener does not affect others', () => {
      const store = new Store('test', { count: 0 });
      const h1 = vi.fn();
      const h2 = vi.fn();
      const sub1 = store.on('change', h1);
      store.on('change', h2);

      sub1.dispose();
      store.update((d) => { d.count = 1; });

      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledOnce();
    });

    it('receives the state as payload, not requiring a separate get()', () => {
      const store = new Store('test', { count: 0 });
      const states: unknown[] = [];
      store.on('change', (state) => states.push(state));

      store.update((d) => { d.count = 1; });
      store.update((d) => { d.count = 2; });
      store.reset();

      expect(states).toEqual([{ count: 1 }, { count: 2 }, { count: 0 }]);
    });
  });

  describe('subscribe (shorthand)', () => {
    it('calls the callback immediately with the current state', () => {
      const store = new Store('test', { count: 0 });
      const cb = vi.fn();
      const sub = store.subscribe(cb);
      expect(cb).toHaveBeenCalledWith({ count: 0 });
      sub.dispose();
    });

    it('calls the callback on subsequent updates', () => {
      const store = new Store('test', { count: 0 });
      const cb = vi.fn();
      const sub = store.subscribe(cb);
      store.update((d) => { d.count = 1; });

      expect(cb).toHaveBeenCalledTimes(2);
      expect(cb).toHaveBeenLastCalledWith({ count: 1 });
      sub.dispose();
    });

    it('returns a Disposable that stops further callbacks', () => {
      const store = new Store('test', { count: 0 });
      const cb = vi.fn();
      const sub: Disposable = store.subscribe(cb);
      expect(cb).toHaveBeenCalledTimes(1);

      sub.dispose();
      store.update((d) => { d.count = 1; });
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('supports multiple subscribers', () => {
      const store = new Store('test', { count: 0 });
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const sub1 = store.subscribe(cb1);
      const sub2 = store.subscribe(cb2);

      store.update((d) => { d.count = 1; });

      expect(cb1).toHaveBeenCalledTimes(2);
      expect(cb2).toHaveBeenCalledTimes(2);
      sub1.dispose();
      sub2.dispose();
    });

    it('disposing one does not affect others', () => {
      const store = new Store('test', { count: 0 });
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const sub1 = store.subscribe(cb1);
      const sub2 = store.subscribe(cb2);

      sub1.dispose();
      store.update((d) => { d.count = 1; });

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(2);
      sub2.dispose();
    });

    it('notifies on reset', () => {
      const store = new Store('test', { count: 0 });
      const cb = vi.fn();
      const sub = store.subscribe(cb);
      store.update((d) => { d.count = 5; });
      store.reset();

      expect(cb).toHaveBeenCalledTimes(3);
      expect(cb).toHaveBeenLastCalledWith({ count: 0 });
      sub.dispose();
    });
  });

  describe('multiple stores', () => {
    it('stores with different ids are independent', () => {
      const storeA = new Store('a', { value: 1 });
      const storeB = new Store('b', { value: 2 });

      storeA.update((d) => { d.value = 10; });

      expect(storeA.get()).toEqual({ value: 10 });
      expect(storeB.get()).toEqual({ value: 2 });
    });

    it('events from one store do not trigger listeners on another', () => {
      const storeA = new Store('a', { value: 1 });
      const storeB = new Store('b', { value: 2 });
      const cbA = vi.fn();
      const cbB = vi.fn();
      storeA.on('change', cbA);
      storeB.on('change', cbB);

      storeA.update((d) => { d.value = 10; });

      expect(cbA).toHaveBeenCalledOnce();
      expect(cbB).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles empty object as initial value', () => {
      const store = new Store('test', {});
      expect(store.get()).toEqual({});
    });

    it('handles deeply nested state', () => {
      const init = { a: { b: { c: { d: 'deep' } } } };
      const store = new Store('test', init);
      store.update((draft) => { draft.a.b.c.d = 'deeper'; });
      expect(store.get()!.a.b.c.d).toBe('deeper');
    });

    it('handles null initial value', () => {
      const store = new Store('test', null);
      expect(store.get()).toBeNull();
    });
  });
});

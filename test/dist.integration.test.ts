import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

type CounterState = {
  count: number;
};

const distEsmPath = resolve(process.cwd(), 'dist/index.js');
const distCjsPath = resolve(process.cwd(), 'dist/index.cjs');
const shouldRunDistTests = process.env.RUN_DIST_TESTS === '1';
const hasBuiltDist = existsSync(distEsmPath) && existsSync(distCjsPath);

describe.runIf(shouldRunDistTests && hasBuiltDist)('dist integration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('works from ESM dist output', async () => {
    const { Store } = await import('../dist/index.js');
    const store = new Store<CounterState>('dist-esm', { count: 0 });

    const seen: number[] = [];
    const sub = store.subscribe((state: CounterState) => {
      seen.push(state.count);
    });

    store.update((draft: CounterState) => {
      draft.count += 1;
    });

    sub.dispose();

    expect(store.get()).toEqual({ count: 1 });
    expect(seen).toEqual([0, 1]);
  });

  it('works from CJS dist output', () => {
    const require = createRequire(import.meta.url);
    const { Store } = require('../dist/index.cjs') as {
      Store: new <T>(id: string, initValue: T) => {
        get(): T | undefined;
        update(mutation: (draft: T) => void): void;
        on(type: 'change', handler: (state: T) => void): { dispose(): void };
      };
    };

    const store = new Store<CounterState>('dist-cjs', { count: 0 });

    const seen: number[] = [];
    const sub = store.on('change', (state: CounterState) => {
      seen.push(state.count);
    });

    store.update((draft: CounterState) => {
      draft.count += 2;
    });

    sub.dispose();

    expect(store.get()).toEqual({ count: 2 });
    expect(seen).toEqual([2]);
  });
});

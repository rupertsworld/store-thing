import { beforeEach, describe, expect, it } from 'vitest';
import { Store } from '../src/index';

type CounterState = {
  count: number;
};

describe('README usage integration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('matches the documented usage flow end-to-end', () => {
    const initialState: CounterState = { count: 0 };
    const store = new Store<CounterState>('counter', initialState);

    const changeEvents: number[] = [];
    const subscriptionEvents: number[] = [];

    const changeListener = store.on('change', (state) => {
      changeEvents.push(state.count);
    });

    const subscription = store.subscribe((state) => {
      subscriptionEvents.push(state.count);
    });

    store.update((draft) => {
      draft.count += 1;
    });
    store.update((draft) => {
      draft.count += 1;
    });

    expect(store.get()).toEqual({ count: 2 });

    store.reset();
    expect(store.get()).toEqual({ count: 0 });

    changeListener.dispose();
    subscription.dispose();

    store.update((draft) => {
      draft.count += 1;
    });

    expect(changeEvents).toEqual([1, 2, 0]);
    expect(subscriptionEvents).toEqual([0, 1, 2, 0]);
  });
});

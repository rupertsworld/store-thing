import { Store } from '../src/index.js';

const initState = {
  count: 0,
};

export const store = new Store('store', initState, { storage: 'local' });

store.subscribe((state) => console.log(`Count: ${state.count}`));

function increment() {
  store.update((state) => (state.count += 1));
}

increment();
increment();

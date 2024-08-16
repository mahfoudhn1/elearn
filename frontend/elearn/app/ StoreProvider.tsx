"use client"; // Ensure this is a client component

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store/store'

console.log('Store:', store);
console.log('Persistor:', persistor);

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  return <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>

              {children}
          </PersistGate>
      </Provider>;
};

export default StoreProvider;

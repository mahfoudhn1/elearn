"use client"; // Ensure this is a client component

import { Provider } from 'react-redux';
import { store } from '../store/store'; // Adjust the path if necessary
import TokenHandler from './components/TokenHandler';

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  return <Provider store={store}>
        <TokenHandler />
        {children}
        </Provider>;
};

export default StoreProvider;

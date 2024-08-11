"use client"; // Ensure this is a client component

import { Provider } from 'react-redux';
import { store } from '../store/store'; // Adjust the path if necessary

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  return <Provider store={store}>{children}</Provider>;
};

export default StoreProvider;

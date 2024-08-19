
import { configureStore } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import { persistReducer, persistStore } from 'redux-persist';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import authReducer from './authSlice';


const persistConfig = {
  key: 'authReducer',
  storage,
};

const persistedReducer = persistReducer(persistConfig, authReducer);


export const store = configureStore({
  reducer: {
    auth: persistedReducer ,
    // Add other reducers here if necessary
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
  

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

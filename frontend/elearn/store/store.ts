import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage'; 


const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    whitelist: ['auth'], 
  };
  
const persistedReducer = persistReducer(persistConfig, authReducer);



  export const store = configureStore({
    reducer: {
      auth: persistedReducer,
      // Add other reducers here if necessary
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
  
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

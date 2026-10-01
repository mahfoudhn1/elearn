import Constants from 'expo-constants';

/**
 * Runtime config pulled from `app.json` -> `expo.extra`.
 *
 * `googleWebClientId` must be set for Google Sign-In to work. On iOS/Android
 * it is the **Web client ID** from Google Cloud Console (the one that has the
 * reversed client ID scheme). Leave empty during local dev; the login button
 * will disable itself and warn.
 */
export const config = {
  googleWebClientId: Constants.expoConfig?.extra?.googleWebClientId ?? '',
};

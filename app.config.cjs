/**
 * Loaded by Expo CLI during `expo export` so .env / shell EXPO_PUBLIC_* reach Metro inlining.
 */
require('dotenv').config();

const appJson = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    ...config?.extra,
  },
});

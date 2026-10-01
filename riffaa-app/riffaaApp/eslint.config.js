// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // SDK 57's eslint-config-expo enables the React Compiler hook rules. The
      // patterns these two flag are scheduled for removal by the redesign
      // phases (react-query in Phase 8, screen rewrites in Phases 2/4/5), so
      // keep them visible as warnings instead of blocking the build meanwhile.
      // TODO(phase-10): remove this override once those screens are migrated.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
]);

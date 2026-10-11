const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

// Android Gradle Plugin used by the root project. Kept in sync with the AGP
// version React Native 0.86 ships with (react-native/gradle/libs.versions.toml).
const GRADLE_PLUGIN_VERSION = "8.12.0";

// @jitsi/react-native-sdk requires minSdkVersion >= 26.
const MIN_SDK_VERSION = 26;

module.exports = function withJitsiAndroid(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const buildGradlePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "build.gradle"
      );

      if (!fs.existsSync(buildGradlePath)) {
        return modConfig;
      }

      let contents = fs.readFileSync(buildGradlePath, "utf8");

      if (!contents.includes("gradlePluginVersion")) {
        contents = `ext {\n  gradlePluginVersion = '${GRADLE_PLUGIN_VERSION}'\n  minSdkVersion = ${MIN_SDK_VERSION}\n}\n\n${contents}`;
        fs.writeFileSync(buildGradlePath, contents);
      }

      return modConfig;
    },
  ]);
};

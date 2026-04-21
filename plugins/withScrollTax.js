const {
  withAndroidManifest,
  withInfoPlist,
} = require("@expo/config-plugins");

module.exports = function withScrollTax(config) {
  // iOS plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSFamilyControlsUsageDescription =
      "This app uses Screen Time to help you reduce social media usage.";

    return config;
  });

  // Android manifest
  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];

    app.service = app.service || [];

    app.service.push({
      $: {
        "android:name": ".enforcement.AppBlockAccessibilityService",
        "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
      },
    });

    return config;
  });

  return config;
};
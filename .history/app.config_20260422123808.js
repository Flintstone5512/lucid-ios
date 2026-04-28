export default {
  expo: {
    name: "ScrollTax",
    slug: "scroll-tax",

    ios: {
      bundleIdentifier: "com.yourapp.scrolltax",
      entitlements: {
        "com.apple.developer.family-controls": true,
        "com.apple.security.application-groups": [
          "group.com.yourapp.scrolltax"
        ]
      }
    },

    android: {
      package: "com.yourapp.scrolltax",
      permissions: [
        "SYSTEM_ALERT_WINDOW",
        "PACKAGE_USAGE_STATS",
        "FOREGROUND_SERVICE"
      ]
    },

    plugins: [
      "expo-dev-client",

      // ✅ ADD THIS BLOCK
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-4629047096490080~8792762842",
          iosAppId: "a-app-pub-4629047096490080~9722701138"
        }
      ],

      "./plugins/withScrollTax"
    ]
  }
};
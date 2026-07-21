export default {
  expo: {
    name: "ScrollTax",
    slug: "scroll-tax",
    scheme: "scroll-tax",
    owner: "principledwarrior",

    extra: {
      eas: {
        projectId: "ffef0193-896d-42c0-a995-5cec0cc5e73b"
      }
    },

    autolinking: {
      searchPaths: ["./modules"]
    },

    ios: {
      bundleIdentifier: "com.yourapp.scrolltax",
      buildNumber: "32",
      deploymentTarget: "16.4",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
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

      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.4"
          }
        }
      ],

      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-4629047096490080~8792762842",
          iosAppId: "ca-app-pub-4629047096490080~9722701138"
        }
      ],

      "./plugins/withScrollTax",
      "./plugins/withShieldExtensions"
    ]
  }
};
export default {
  expo: {
    name: "Lucid",
    slug: "scroll-tax",
    scheme: "scroll-tax",
    owner: "principledwarrior",
    icon: "./assets/icon.png",

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
      buildNumber: "48",
      deploymentTarget: "16.4",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSUserTrackingUsageDescription:
          "Lucid uses this to deliver relevant ads. No browsing activity is collected or sold.",
        NSCameraUsageDescription:
          "Lucid uses the camera to let you scan a payment card when subscribing.",
      },
      entitlements: {
        "com.apple.developer.family-controls": true,
        "com.apple.security.application-groups": [
          "group.com.yourapp.scrolltax"
        ],
        "com.apple.developer.applesignin": ["Default"]
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
      "@stripe/stripe-react-native",
      "expo-apple-authentication",

      [
        "expo-notifications",
        {
          iosDisplayInForeground: true
        }
      ],

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
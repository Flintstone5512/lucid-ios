// src/services/adService.js

const {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} = require("react-native-google-mobile-ads");

const { Platform } = require("react-native");

const PROD_IOS_AD_UNIT     = "ca-app-pub-4629047096490080/8803311640";
const PROD_ANDROID_AD_UNIT = "ca-app-pub-4629047096490080/2812618363";

// Override via EXPO_PUBLIC_ADMOB_IOS_UNIT_ID in .env to use Google's test ID
// during TestFlight QA: ca-app-pub-3940256099942544/1712485313
const adUnitId = Platform.select({
  ios:     process.env.EXPO_PUBLIC_ADMOB_IOS_UNIT_ID     || PROD_IOS_AD_UNIT,
  android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_AD_UNIT || PROD_ANDROID_AD_UNIT,
});

export function showRewardedAd(onRewardEarned, onClosed) {
  const rewarded = RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  let rewardedListener;
  let loadedListener;
  let closedListener;
  let errorListener;

  function cleanup() {
    rewardedListener?.();
    loadedListener?.();
    closedListener?.();
    errorListener?.();
  }

  loadedListener = rewarded.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => rewarded.show()
  );

  rewardedListener = rewarded.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    () => {
      if (onRewardEarned) onRewardEarned();
    }
  );

  closedListener = rewarded.addAdEventListener(
    AdEventType.CLOSED,
    () => {
      cleanup();
      if (onClosed) onClosed();
    }
  );

  // If the ad fails to load, fall back so the user isn't stuck
  errorListener = rewarded.addAdEventListener(
    AdEventType.ERROR,
    () => {
      cleanup();
      console.log("[AD] Load failed — skipping ad, granting reward");
      if (onRewardEarned) onRewardEarned();
    }
  );

  rewarded.load();
}

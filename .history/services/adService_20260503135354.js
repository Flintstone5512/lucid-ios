// src/services/adService.js

const isDev = __DEV__;

/* =========================
   🔥 DEV MODE (NO IMPORT)
========================= */
export function showRewardedAd(onRewardEarned) {
  if (isDev) {
    console.log("[DEV] Simulating rewarded ad...");

    setTimeout(() => {
      console.log("[DEV] Reward granted");
      if (onRewardEarned) onRewardEarned();
    }, 500);

    return;
  }

  /* =========================
     🔥 PRODUCTION ONLY IMPORT
  ========================= */

  const { Platform } = require("react-native");
  const {
    RewardedAd,
    RewardedAdEventType,
  } = require("react-native-google-mobile-ads");

  const adUnitId = Platform.select({
    android: "ca-app-pub-4629047096490080/2812618363",
    ios: "ca-app-pub-4629047096490080/8803311640",
  });

  const rewarded = RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  let rewardListener;
  let loadedListener;
  let closedListener;

  loadedListener = rewarded.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => rewarded.show()
  );

  rewardListener = rewarded.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    () => {
      if (onRewardEarned) onRewardEarned();
    }
  );

  closedListener = rewarded.addAdEventListener(
    RewardedAdEventType.CLOSED,
    () => {
      rewardListener?.();
      loadedListener?.();
      closedListener?.();
    }
  );

  rewarded.load();
}
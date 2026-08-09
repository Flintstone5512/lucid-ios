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
    AdEventType,
  } = require("react-native-google-mobile-ads");

  const adUnitId = Platform.select({
    android: "ca-app-pub-4629047096490080/2812618363",
    ios: "ca-app-pub-4629047096490080/8803311640",
  });

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

  // AdEventType.CLOSED (not RewardedAdEventType) — rewarded ads inherit base events
  closedListener = rewarded.addAdEventListener(
    AdEventType.CLOSED,
    () => cleanup()
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
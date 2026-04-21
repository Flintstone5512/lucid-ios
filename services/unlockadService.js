// src/services/unlockService.js

import { showRewardedAd } from "./adService";
import api from "./api";

export function unlockDecksWithAd(onSuccess) {
  showRewardedAd(async () => {
    try {
      const res = await api.post("/unlock/reward", {
        type: "deck",
      });

      if (onSuccess) onSuccess(res.data.unlock);
    } catch (err) {
      console.error(err);
    }
  });
}
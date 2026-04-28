import { useEffect } from "react";
import { grantAndroidUnlock } from "../services/nativeBridge";
import { getUnlockStatus } from "../services/unlockService";

export function useUnlockPolling() {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getUnlockStatus();

        if (data?.expiresAt) {
          await grantAndroidUnlock(data.expiresAt);
        }
      } catch (err) {
        console.log("Unlock sync error:", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);
}
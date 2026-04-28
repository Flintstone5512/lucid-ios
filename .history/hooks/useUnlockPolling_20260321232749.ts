import { useEffect } from "react";
import { getUnlockStatus } from "../services/unlockService";
import { applyShield, clearShield } from "../services/nativeBridge";

export function useUnlockPolling() {
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getUnlockStatus();

      if (data.active) {
        await clearShield();
      } else {
        await applyShield();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);
}
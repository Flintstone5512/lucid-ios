import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { getSharedState } from "../../services/api";
import { useRefocusStore } from "../../store/useRefocusStore";

import { showBlockingOverlay } from "../../services/nativeBridge";
import UserDashboard from "../dashboard/userHome";
import ParentDashboard from "../parent/index";

export default function Home() {
  const { context, setStatePatch } = useRefocusStore();

  useEffect(() => {
    async function load() {
      try {
        const state = await getSharedState();

        setStatePatch({
          ...state,
          context: state.context, // 🔥 IMPORTANT
        });
      } catch (err) {
        console.log("Home load error:", err);
      }
    }

    load();
  }, []);
useEffect(() => {
  async function testOverlay() {
    console.log("[TEST] Attempting overlay...");

    try {
      await showBlockingOverlay("com.zhiliaoapp.musically");
      console.log("[TEST] Overlay call finished");
    } catch (err) {
      console.log("[TEST] Overlay failed:", err);
    }
  }

  testOverlay();
}, []);


  // 🔥 loading state (prevents blank screen)
  if (!context) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // 🔥 ROLE SWITCH
  if (context.role === "parent") {
    return <ParentDashboard />;
  }

  return <UserDashboard />;
}
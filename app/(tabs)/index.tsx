import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { getSharedState } from "../../services/api";
import { useRefocusStore } from "../../store/useRefocusStore";
import { syncEnforcementSettings } from "../../services/enforcementSync";
import { syncEnforcementDecision } from "../../services/enforcementSync";

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
          context: state.context,
        });

        await syncEnforcementSettings({
          role: state.context?.role || "solo",
          enforcementMode: state.settings?.enforcementMode || "self",
          focusMode: state.settings?.focusMode || "soft",
        });

        await syncEnforcementDecision();
      } catch (err) {
        console.log("Home load error:", err);
      }
    }

    load();
  }, []);

  if (!context) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (context.role === "parent") {
    return <ParentDashboard />;
  }

  return <UserDashboard />;
}
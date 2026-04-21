import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";

import { useRefocusStore } from "../../store/useRefocusStore";
import { getSharedState } from "../../services/api";

import ParentDashboard from "../parent/index";
import UserDashboard from "../dashboard/userHome";

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
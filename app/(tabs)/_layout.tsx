import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          backgroundColor: "#0B1220",
          borderTopWidth: 0,
          height: 70,
        },

        tabBarActiveTintColor: "#ff8a3d",
        tabBarInactiveTintColor: "#6B7280",
      }}
    >
      {/* 🔥 DASHBOARD */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />

      {/* 🔥 Decks */}
     <Tabs.Screen
        name="decks"
        options={{
          title: "Decks",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="books.vertical.fill" size={26} color={color} />
          ),
        }}
      />

      {/* 🔥 ANALYTICS */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Stats",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="chart.bar.fill" color={color} />
          ),
        }}
      />

      {/* 🔥 SETTINGS */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Control",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
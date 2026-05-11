import { router } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/splash");
    }, 0); // 🔥 ensures router is mounted

    return () => clearTimeout(t);
  }, []);

  return null;
}
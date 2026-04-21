import axios from "axios";
import { Platform } from "react-native";

const baseURL =
  Platform.OS === "android"
    ? "http://10.0.2.2:3001/api"
    : "http://localhost:3001/api";

const api = axios.create({
  baseURL,
  timeout: 10000,
});

export default api;
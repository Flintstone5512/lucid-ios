import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { AuthRequest, ResponseType, makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const API_BASE = "https://lucid-backend-production.up.railway.app/api";

// Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file.
// Create credentials at: https://console.cloud.google.com/apis/credentials
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

async function exchangeWithBackend(path: string, body: object): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(data.error || "Auth failed");
  return data.token;
}

export async function signInWithGoogle(): Promise<string> {
  const redirectUri = makeRedirectUri({ scheme: "scroll-tax" });

  const request = new AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ["profile", "email"],
    redirectUri,
    responseType: ResponseType.Token,
    usePKCE: false,
  });

  const result = await request.promptAsync({
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  });

  if (result.type !== "success") {
    throw new Error("Google sign-in cancelled");
  }

  return exchangeWithBackend("/auth/google/extension", {
    accessToken: result.params.access_token,
  });
}

export async function signInWithApple(): Promise<string> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error("Apple did not return an identity token");
  }

  return exchangeWithBackend("/auth/apple", {
    identityToken: credential.identityToken,
    fullName: credential.fullName,
  });
}

export const isAppleSignInAvailable = Platform.OS === "ios";

import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl && typeof window !== "undefined") {
  console.warn("Missing NEXT_PUBLIC_CONVEX_URL");
}

export const convex = new ConvexReactClient(convexUrl || "https://dummy.convex.dev");

export function setConvexAuthToken(token) {
  if (token) {
    convex.setAuth(token);
  } else {
    convex.clearAuth();
  }
}

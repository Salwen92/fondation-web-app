// Runtime initialization for production Convex API injection
// This file bridges the gap between build-time stubs and runtime API

import { initializeConvexAPI } from "./convex-adapter.js";

export async function initializeProductionAPI(convexUrl: string) {
  try {
    // In production, dynamically import the real Convex API
    // This would be injected by the container at runtime
    if (process.env.NODE_ENV === "production") {
      console.log("🔄 Attempting to load production Convex API...");
      
      // Check if web API is available in container
      try {
        const { api } = await import("../../web/convex/_generated/api.js");
        initializeConvexAPI(api);
        console.log("✅ Production Convex API loaded successfully");
        return true;
      } catch (error) {
        console.warn("⚠️  Production API not available, using stubs:", error);
      }
    }
    
    // Development or fallback mode - keep using stubs
    console.log("🚧 Running with API stubs (development mode)");
    return false;
  } catch (error) {
    console.error("❌ Failed to initialize production API:", error);
    return false;
  }
}
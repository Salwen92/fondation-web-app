import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { safeObfuscate, safeDeobfuscate } from "@/lib/simple-crypto";
import { logger } from "@/lib/logger";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "http://localhost:3210";
const client = new ConvexHttpClient(convexUrl);

/**
 * API route to securely store GitHub access tokens with encryption
 * Called after successful authentication to store the encrypted token
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the user is authenticated
    const session = await auth();
    if (!session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized - no valid session" },
        { status: 401 }
      );
    }

    const body = await req.json() as { accessToken?: string };
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    // Obfuscate the token before storing (TODO: Use proper encryption in production)
    const obfuscatedToken = safeObfuscate(accessToken);

    // Store the obfuscated token in Convex
    await client.mutation(api.users.updateGitHubToken, {
      githubId: session.user.githubId,
      accessToken: obfuscatedToken,
    });

    return NextResponse.json({ 
      success: true,
      message: "Token stored securely",
      // NOTE: Using basic obfuscation in development. Production requires proper encryption.
    });

  } catch (error) {
    logger.error("Error storing GitHub token", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { 
        error: "Failed to store token securely",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * API route to retrieve and decrypt GitHub access tokens
 * Returns the decrypted token for API usage
 */
export async function GET(_req: NextRequest) {
  try {
    // Verify the user is authenticated
    const session = await auth();
    if (!session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized - no valid session" },
        { status: 401 }
      );
    }

    // Get the obfuscated token from Convex
    const storedToken = await client.query(api.users.getGitHubToken, {
      githubId: session.user.githubId,
    });

    if (!storedToken) {
      return NextResponse.json(
        { error: "No token found for user" },
        { status: 404 }
      );
    }

    // Deobfuscate the token before returning
    const deobfuscatedToken = safeDeobfuscate(storedToken);
    
    return NextResponse.json({ 
      accessToken: deobfuscatedToken,
      wasObfuscated: storedToken !== deobfuscatedToken
    });

  } catch (error) {
    logger.error("Error retrieving GitHub token", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { 
        error: "Failed to retrieve token",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
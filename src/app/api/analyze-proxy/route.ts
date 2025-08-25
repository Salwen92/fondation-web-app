import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { analyzeProxySchema } from "@/lib/validation";
import { withValidation } from "@/lib/middleware/validation";

export const POST = withValidation(
  analyzeProxySchema,
  async (req: NextRequest, body: { jobId: string; repositoryUrl: string; branch?: string; callbackUrl: string; callbackToken: string; githubToken?: string }) => {
    try {
    
    logger.info("Forwarding request to Scaleway Gateway", {
      jobId: body.jobId,
      repositoryUrl: body.repositoryUrl,
      branch: body.branch ?? "main",
    });
    
    // Forward to Scaleway Gateway (port 8081 in dev, Cloud Run still on 8080 as fallback)
    const gatewayUrl = process.env.SCALEWAY_GATEWAY_URL ?? "http://localhost:8081";
    const response = await fetch(`${gatewayUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Gateway error", new Error(errorText));
      return NextResponse.json(
        { error: `Gateway error: ${errorText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json() as Record<string, unknown>;
    logger.info("Success response from gateway", { data });
    
    return NextResponse.json(data);
    } catch (error) {
      logger.error("Analyze proxy error", error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Proxy error" },
        { status: 500 }
      );
    }
  }
);
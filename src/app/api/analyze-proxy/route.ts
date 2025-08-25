import { type NextRequest, NextResponse } from "next/server";

interface AnalyzeRequestBody {
  jobId?: string;
  repositoryUrl?: string;
  branch?: string;
  callbackUrl?: string;
  callbackToken?: string;
  githubToken?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AnalyzeRequestBody;
    
    console.log("[Analyze Proxy] Forwarding request to Scaleway Gateway", {
      jobId: body.jobId ?? "unknown",
      repositoryUrl: body.repositoryUrl ?? "unknown",
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
      console.error("[Analyze Proxy] Gateway error:", errorText);
      return NextResponse.json(
        { error: `Gateway error: ${errorText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json() as Record<string, unknown>;
    console.log("[Analyze Proxy] Success response:", data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Analyze Proxy] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy error" },
      { status: 500 }
    );
  }
}
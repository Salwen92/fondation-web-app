import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[Analyze Proxy] Forwarding request to local Cloud Run service", {
      jobId: body.jobId,
      repositoryUrl: body.repositoryUrl,
    });
    
    // Forward to local Cloud Run service
    const response = await fetch("http://localhost:8080/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Analyze Proxy] Cloud Run error:", errorText);
      return NextResponse.json(
        { error: `Cloud Run error: ${errorText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
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
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const backendUrl =
      process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

    try {
      // Forward to Python backend
      const response = await fetch(`${backendUrl}/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.detail || `Backend responded with ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (backendError) {
      console.error("Python backend error:", backendError);
      return NextResponse.json(
        { error: "Failed to communicate with analysis backend" },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("API Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

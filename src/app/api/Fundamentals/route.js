import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    // Validate symbol parameter
    if (
      !symbol ||
      typeof symbol !== "string" ||
      !/^[A-Za-z0-9\-\.]+$/.test(symbol)
    ) {
      return NextResponse.json(
        {
          error:
            "Symbol parameter is required and must be a valid alphanumeric string",
        },
        { status: 400 }
      );
    }

    const data = { data : 'coming soon'}

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    // Handle errors
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

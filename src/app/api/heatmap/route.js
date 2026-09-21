// src/app/api/heatmap/route.js
import { NextResponse } from "next/server";
import { getSectorBreadthData } from "@/services/market/sectorBreadthService.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const data = await getSectorBreadthData({ forceRefresh });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Error serving /api/heatmap:", error);
    return NextResponse.json(
      { error: "Failed to fetch sector heatmap and breadth data", details: error.message },
      { status: 500 }
    );
  }
}

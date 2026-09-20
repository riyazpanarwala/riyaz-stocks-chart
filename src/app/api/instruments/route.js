// src/app/api/instruments/route.js
import { NextResponse } from "next/server";
import { getUnifiedInstruments } from "@/lib/server/instruments";

export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
  try {
    const data = await getUnifiedInstruments();

    return NextResponse.json(
      {
        instruments: data.instruments,
        foSymbols: data.foSymbols,
        foLots: data.foLots,
        updatedAt: data.updatedAt,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        },
      }
    );
  } catch (err) {
    console.error("Error serving /api/instruments:", err);
    return NextResponse.json(
      { error: "Failed to fetch instruments" },
      { status: 500 }
    );
  }
}

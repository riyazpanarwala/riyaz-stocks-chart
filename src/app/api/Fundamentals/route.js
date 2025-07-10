import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

// This is for tempoary purpose need to remove this in future.
async function getFinancialFundamentals(symbol) {
  const url = `https://www.screener.in/company/${symbol}/consolidated/`;

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000, // 10 second timeout
    });

    const $ = cheerio.load(response.data);
    const epsValues = [];

    $("tr.stripe").each((_, tr) => {
      const firstCell = $(tr).find("td").first().text().trim();
      if (firstCell.includes("EPS in Rs")) {
        $(tr)
          .find("td")
          .slice(1)
          .each((_, td) => {
            const value = $(td).text().trim();
            if (value && !isNaN(parseFloat(value))) {
              epsValues.push(value);
            }
          });
      }
    });

    let bookValue = null,
      pe = "",
      marketCap = "",
      ROCE = "",
      ROE = "",
      price = "",
      pb = "";

    $("li.flex").each((_, li) => {
      const label = $(li).find(".name").text().trim();
      const numberval = $(li).find(".number").text().trim();

      // Skip if no valid number value
      if (!numberval) return;

      if (label === "Book Value") {
        bookValue = numberval;
      } else if (label === "Stock P/E") {
        pe = numberval;
      } else if (label === "Market Cap") {
        marketCap = numberval;
      } else if (label === "ROE") {
        ROE = numberval;
      } else if (label === "ROCE") {
        ROCE = numberval;
      } else if (label === "Current Price") {
        price = numberval;
      }
    });

    if (price && bookValue) {
      const priceNum = parseFloat(price.replace(/,/g, ""));
      const bookValueNum = parseFloat(bookValue.replace(/,/g, ""));
      if (!isNaN(priceNum) && !isNaN(bookValueNum) && bookValueNum !== 0) {
        pb = (priceNum / bookValueNum).toFixed(2);
      }
    }

    return {
      symbol,
      epsTTM: epsValues,
      latestEPS: epsValues[epsValues.length - 1],
      bookValue: bookValue,
      pe,
      pb,
      marketCap,
      ROE,
      ROCE,
      price,
    };
  } catch (error) {
    console.error(`Error for ${symbol}:`, error.message);
    return null;
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter is required" },
        { status: 400 }
      );
    }

    // Validate symbol parameter
    if (
      !symbol ||
      typeof symbol !== "string" ||
      !/^[A-Za-z0-9\-\.]+$/.test(symbol)
    ) {
      return NextResponse.json(
        { error: "Invalid symbol parameter" },
        { status: 400 }
      );
    }

    const data = await getFinancialFundamentals(symbol);

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

import { NextResponse } from "next/server";
import axios from "axios";
const cheerio = require("cheerio");

async function getEPSandBookValue(symbol) {
  const url = `https://www.screener.in/company/${symbol}/consolidated/`;

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
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
            epsValues.push($(td).text().trim());
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
      pb = (parseFloat(price) / parseFloat(bookValue)).toFixed(2);
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

    const data = await getEPSandBookValue(symbol);

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

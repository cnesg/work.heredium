import { NextResponse } from "next/server";
import Papa from "papaparse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Default is cn's existing "헤레디움_기사모음" sheet, updated daily by their
// Naver-search crawler. Override with NEWS_SHEET_ID if it ever moves.
const SHEET_ID = process.env.NEWS_SHEET_ID || "151rd2uoLgST8Aw7M_0iDWEbPI7yDlepz_4AdAKOBLrw";

function isExcluded(value) {
  const v = (value || "").trim();
  if (!v) return false;
  return !["N", "n", "0", "false", "FALSE", "아니오"].includes(v);
}

export async function GET() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "SHEET_FETCH_FAILED", message: "시트를 불러오지 못했어요. 공유 설정이 '링크가 있는 모든 사용자'인지 확인해주세요." },
      { status: 502 }
    );
  }
  const csv = await res.text();
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

  const rows = (parsed.data || [])
    .filter((r) => r["제목"] && !isExcluded(r["분석제외여부"]))
    .map((r) => ({
      date: r["일자"] || "",
      press: r["언론사"] || "",
      writer: r["기고자"] || "",
      title: r["제목"] || "",
      people: r["인물"] || "",
      location: r["위치"] || "",
      org: r["기관"] || "",
      keywords: r["키워드"] || "",
      features: r["특성추출"] || "",
      body: r["본문"] || "",
      url: r["URL"] || "",
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 30);

  return NextResponse.json({ articles: rows });
}

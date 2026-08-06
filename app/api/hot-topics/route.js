import { NextResponse } from "next/server";
import Papa from "papaparse";

export const dynamic = "force-dynamic";

const ART_TREND_SHEET = "1hwaj4YOVJMsJHqJmKtjtAwPjILTt13_trWSuCpHgFoY";
const ART_GIDS = {
  domestic: process.env.ART_TREND_GID_DOMESTIC || "1995700730",
  global: process.env.ART_TREND_GID_GLOBAL || "1307911622",
};
const MUSIC_SHEET = process.env.MUSIC_NEWS_SHEET_ID || "1Fkmoxy8cdklyE_elwEfMf5PH1ML2yJYvgM_xSiaug8c";

// generic words that show up everywhere and tell us nothing — filtering
// these out is what lets real names (작가, 연주자, 도시, 기관) surface
const GENERIC_ART = new Set([
  "미술","미술관","전시","전시회","작품","작가","갤러리","아트","예술","문화",
  "컬렉션","현대미술","박물관","공간","건축","역사","展","기획","특별전",
  "space","art","artist","museum","gallery","exhibition","collection","culture",
  "the","and","of","in","for","with","new","this",
  "헤레디움","대전","공연","지역","건물","공연장","무대","독주회","독주",
  "복합문화공간","오픈","스테이지","네","번째",
]);
const GENERIC_MUSIC = new Set([
  "음악","공연","연주","연주회","음악회","공연장","무대","독주회","독주",
  "클래식","오케스트라","교향악단","협연","리사이틀","콘서트","예술",
  "music","concert","orchestra","recital","the","and","of","in","for","with",
  "헤레디움","대전",
]);

function cleanTokens(raw, stopset) {
  return (raw || "")
    .split(/[,，·]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !stopset.has(t.toLowerCase()));
}

async function fetchCsv(url) {
  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const csv = await res.text();
    return Papa.parse(csv, { header: true, skipEmptyLines: true }).data || [];
  } catch {
    return [];
  }
}

function aggregate(sources, stopset) {
  const freq = {};
  const cutoff = Date.now() - 45 * 86400000;

  sources.forEach((rows) => {
    rows.forEach((r) => {
      const dateStr = r["기사발행일"];
      if (dateStr) {
        const t = new Date(dateStr.replace(/\./g, "-")).getTime();
        if (!isNaN(t) && t < cutoff) return;
      }
      const tokens = cleanTokens(r["주요키워드"], stopset);
      tokens.forEach((term) => {
        if (!freq[term]) freq[term] = { count: 0, sample: null };
        freq[term].count += 1;
        if (!freq[term].sample) freq[term].sample = { title: r["기사제목"], url: r["기사링크"] };
      });
    });
  });

  return Object.entries(freq)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 16)
    .map(([term, v]) => ({ term, count: v.count, sample: v.sample }));
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") === "music" ? "music" : "art";

  if (mode === "music") {
    const music = await fetchCsv(`https://docs.google.com/spreadsheets/d/${MUSIC_SHEET}/export?format=csv&gid=0`);
    return NextResponse.json({ topics: aggregate([music], GENERIC_MUSIC), mode });
  }

  const [domestic, global] = await Promise.all([
    fetchCsv(`https://docs.google.com/spreadsheets/d/${ART_TREND_SHEET}/export?format=csv&gid=${ART_GIDS.domestic}`),
    fetchCsv(`https://docs.google.com/spreadsheets/d/${ART_TREND_SHEET}/export?format=csv&gid=${ART_GIDS.global}`),
  ]);
  return NextResponse.json({ topics: aggregate([domestic, global], GENERIC_ART), mode });
}

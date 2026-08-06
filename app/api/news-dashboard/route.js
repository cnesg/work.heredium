import { NextResponse } from "next/server";
import Papa from "papaparse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCES = [
  {
    id: "heredium",
    label: "헤레디움 기사모음",
    category: "art",
    url: `https://docs.google.com/spreadsheets/d/151rd2uoLgST8Aw7M_0iDWEbPI7yDlepz_4AdAKOBLrw/export?format=csv`,
    map: (r) => ({
      loadedAt: r["일자"] || "",
      publishedAt: r["일자"] || "",
      press: r["언론사"] || "",
      title: r["제목"] || "",
      keywords: r["키워드"] ? r["키워드"].split(",").slice(0, 5).join(", ") : "",
      summary: r["본문"] ? r["본문"].slice(0, 120) + "..." : "",
      url: r["URL"] || "",
      sentiment: r["분석제외 여부"] === "" ? "중립" : "분석불가",
      writer: r["기고자"] || "",
      source: "heredium",
      category: "art",
    }),
    skip: (r) => {
      const v = (r["분석제외 여부"] || "").trim();
      return v && !["N", "n", "0", "false", "FALSE", "아니오"].includes(v);
    },
  },
  {
    id: "hankyung",
    label: "한국경제 arte",
    category: "art",
    url: `https://docs.google.com/spreadsheets/d/1hwaj4YOVJMsJHqJmKtjtAwPjILTt13_trWSuCpHgFoY/export?format=csv&gid=1995700730`,
    map: (r) => ({
      loadedAt: r["적재일"] || "",
      publishedAt: r["기사발행일"] || "",
      press: r["보도언론사"] || "",
      title: r["기사제목"] || "",
      keywords: r["주요키워드"] || "",
      summary: r["기사요약"] || "",
      url: r["기사링크"] || "",
      sentiment: "중립",
      writer: "",
      source: "hankyung",
      category: "art",
    }),
    skip: (r) => !r["기사제목"],
  },
  {
    id: "global",
    label: "해외 아트매거진",
    category: "art",
    url: `https://docs.google.com/spreadsheets/d/1hwaj4YOVJMsJHqJmKtjtAwPjILTt13_trWSuCpHgFoY/export?format=csv&gid=1307911622`,
    map: (r) => ({
      loadedAt: r["적재일"] || "",
      publishedAt: r["기사발행일"] || "",
      press: r["보도언론사"] || "",
      title: r["기사제목"] || "",
      keywords: r["주요키워드"] || "",
      summary: r["기사요약"] || "",
      url: r["기사링크"] || "",
      sentiment: "중립",
      writer: "",
      source: "global",
      category: "art",
    }),
    skip: (r) => !r["기사제목"],
  },
  {
    id: "music",
    label: "객석 (클래식 음악)",
    category: "music",
    url: `https://docs.google.com/spreadsheets/d/${process.env.MUSIC_NEWS_SHEET_ID || "1Fkmoxy8cdklyE_elwEfMf5PH1ML2yJYvgM_xSiaug8c"}/export?format=csv&gid=0`,
    map: (r) => ({
      loadedAt: r["적재일"] || "",
      publishedAt: r["기사발행일"] || "",
      press: r["보도언론사"] || "",
      title: r["기사제목"] || "",
      keywords: r["주요키워드"] || "",
      summary: r["기사요약"] || "",
      url: r["기사링크"] || "",
      sentiment: "중립",
      writer: "",
      source: "music",
      category: "music",
    }),
    skip: (r) => !r["기사제목"],
  },
];

async function fetchSheet(source) {
  try {
    const res = await fetch(`${source.url}&_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const csv = await res.text();
    const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });
    return data
      .filter((r) => !source.skip(r))
      .map(source.map)
      .filter((r) => r.title);
  } catch {
    return [];
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const src = searchParams.get("source") || "all";
  const category = searchParams.get("category") || "art"; // "art" | "music" | "all"

  let sources = category === "all" ? SOURCES : SOURCES.filter((s) => s.category === category);
  if (src !== "all") sources = sources.filter((s) => s.id === src);

  const all = (await Promise.all(sources.map(fetchSheet))).flat();

  all.sort((a, b) => {
    const da = a.publishedAt || a.loadedAt;
    const db = b.publishedAt || b.loadedAt;
    return da < db ? 1 : -1;
  });

  return NextResponse.json({
    articles: all,
    total: all.length,
    sources: sources.map((s) => ({ id: s.id, label: s.label, category: s.category })),
  });
}

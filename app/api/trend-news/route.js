import { NextResponse } from "next/server";
import Papa from "papaparse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// "헤레디움 아카이빙" 시트. 탭이 heredium / hankyung / global 로 나뉘어 있고,
// hankyung = 국내 아트 트렌드, global = 해외 아트 트렌드로 쓸 예정.
// 탭별 gid는 시트에서 해당 탭 클릭 → 주소창 #gid=숫자 확인 후 환경변수로 채워주세요.
const SHEET_ID = process.env.ART_TREND_SHEET_ID || "1hwaj4YOVJMsJHqJmKtjtAwPjILTt13_trWSuCpHgFoY";
const GIDS = {
  domestic: process.env.ART_TREND_GID_DOMESTIC || "1995700730", // hankyung 탭 — 한국경제 arte
  global: process.env.ART_TREND_GID_GLOBAL || "1307911622", // global 탭 — 해외 art magazine
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") === "global" ? "global" : "domestic";
  const gid = GIDS[scope];

  if (!gid) {
    return NextResponse.json(
      {
        error: "NO_GID",
        message: `${scope === "domestic" ? "hankyung(국내)" : "global(해외)"} 탭의 gid가 아직 설정되지 않았어요. 시트에서 해당 탭 클릭 후 주소창의 #gid=숫자 값을 ART_TREND_GID_${scope.toUpperCase()} 환경변수에 넣어주세요.`,
      },
      { status: 501 }
    );
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "SHEET_FETCH_FAILED", message: "시트를 불러오지 못했어요. 공유 설정을 확인해주세요." },
      { status: 502 }
    );
  }
  const csv = await res.text();
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

  const rows = (parsed.data || [])
    .filter((r) => r["기사제목"])
    .map((r) => ({
      loadedAt: r["적재일"] || "",
      publishedAt: r["기사발행일"] || "",
      press: r["보도언론사"] || "",
      title: r["기사제목"] || "",
      keywords: r["주요키워드"] || "",
      summary: r["기사요약"] || "",
      url: r["기사링크"] || "",
    }))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 30);

  return NextResponse.json({ articles: rows });
}

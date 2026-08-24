import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  const videoId = extractVideoId(url);
  const key = process.env.YOUTUBE_API_KEY;

  if (!videoId) {
    return NextResponse.json({ error: "유튜브 링크에서 영상 ID를 못 찾았어요." }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY가 설정되지 않았어요." }, { status: 501 });
  }

  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "statistics,snippet");
  statsUrl.searchParams.set("id", videoId);
  statsUrl.searchParams.set("key", key);

  const res = await fetch(statsUrl.toString());
  const data = await res.json();
  const item = data?.items?.[0];

  if (!item) {
    return NextResponse.json({ error: "영상을 찾을 수 없어요. 링크나 공개 설정을 확인해주세요." }, { status: 404 });
  }

  return NextResponse.json({
    views: Number(item.statistics.viewCount || 0),
    likes: Number(item.statistics.likeCount || 0),
    comments: Number(item.statistics.commentCount || 0),
    title: item.snippet.title,
  });
}

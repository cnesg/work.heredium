import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const QUERIES = {
  art: "미술 전시 갤러리 -영어 -영단어 -ielts -vocabulary -토익",
  music: "클래식 음악회 콘서트 연주 -영어 -영단어 -ielts -vocabulary -토익",
};

const PERIOD_DAYS = { day: 1, week: 7, month: 30, all: null };

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") === "art" ? "art" : "music";
  const period = searchParams.get("period") || "month"; // day | week | month | all
  const sort = searchParams.get("sort") || "hot"; // hot | views | recent
  const customQ = searchParams.get("q"); // optional override, e.g. an artist name from hot-topics
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "NO_YOUTUBE_KEY", message: "YOUTUBE_API_KEY가 설정되지 않았어요." },
      { status: 501 }
    );
  }

  // step 1: search for candidate videos
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", customQ ? `${customQ} 미술 -영어 -ielts -vocabulary` : QUERIES[mode]);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", sort === "recent" ? "date" : "viewCount");
  searchUrl.searchParams.set("relevanceLanguage", "ko");
  searchUrl.searchParams.set("maxResults", "50");
  searchUrl.searchParams.set("key", key);

  const days = PERIOD_DAYS[period];
  if (days && !customQ) {
    const after = new Date(Date.now() - days * 86400000).toISOString();
    searchUrl.searchParams.set("publishedAfter", after);
  }

  const searchRes = await fetch(searchUrl.toString());
  const searchData = await searchRes.json();
  if (searchData.error) {
    return NextResponse.json({ error: searchData.error.message }, { status: 500 });
  }

  const ids = (searchData.items || []).map((i) => i.id.videoId).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ videos: [] });
  }

  // step 2: fetch real stats (views/likes) for those videos
  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "snippet,statistics");
  statsUrl.searchParams.set("id", ids.join(","));
  statsUrl.searchParams.set("key", key);

  const statsRes = await fetch(statsUrl.toString());
  const statsData = await statsRes.json();
  if (statsData.error) {
    return NextResponse.json({ error: statsData.error.message }, { status: 500 });
  }

  const now = Date.now();
  let videos = (statsData.items || []).map((item) => {
    const publishedAt = item.snippet.publishedAt;
    const ageDays = Math.max(1, (now - new Date(publishedAt).getTime()) / 86400000);
    const views = Number(item.statistics.viewCount || 0);
    const likes = Number(item.statistics.likeCount || 0);
    const comments = Number(item.statistics.commentCount || 0);
    // "hotness": view velocity, boosted a bit by engagement, decays with age
    const velocity = views / ageDays;
    const hotScore = velocity * (1 + (likes + comments * 2) / Math.max(views, 1));

    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt,
      ageDays: Math.round(ageDays),
      views,
      likes,
      comments,
      hotScore,
      url: `https://www.youtube.com/watch?v=${item.id}`,
    };
  });

  if (sort === "hot") videos.sort((a, b) => b.hotScore - a.hotScore);
  else if (sort === "views") videos.sort((a, b) => b.views - a.views);
  else if (sort === "recent") videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return NextResponse.json({ videos: videos.slice(0, 30) });
}

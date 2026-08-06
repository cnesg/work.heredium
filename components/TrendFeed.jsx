"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Wand2, ExternalLink, Info, TrendingUp, Hash, Tv,
  Flame, Eye, Heart, Clock, X, Search,
} from "lucide-react";

const PALETTE = {
  paper: "var(--surface)", ink: "var(--text)", stone: "#C9C5BE",
  accent: "#e3a54e", music: "#c35131",
};

const STOPWORDS = new Set([
  "the","a","an","and","of","in","on","at","to","for","with","is","are","was",
  "this","that","it","he","she","they","we","you","i","한국","미술","음악","art",
  "music","video","official","2024","2025","2026","ft","feat","공연","전시",
  "ㅣ","│","|","the","mv","live","full",
]);

function formatViews(n) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString();
}

function extractKeywords(videos) {
  const freq = {};
  videos.forEach((v) => {
    const words = v.title
      .replace(/[^\w가-힣\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w.toLowerCase()));
    const weight = Math.log10(Math.max(v.views, 10)); // view-weighted, log-scaled
    words.forEach((w) => { freq[w] = (freq[w] || 0) + weight; });
  });
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 14)
    .map(([word, score]) => ({ word, score: Math.round(score * 10) / 10 }));
}

function extractChannels(videos) {
  const agg = {};
  videos.forEach((v) => {
    if (!agg[v.channel]) agg[v.channel] = { count: 0, views: 0 };
    agg[v.channel].count += 1;
    agg[v.channel].views += v.views;
  });
  return Object.entries(agg)
    .sort(([, a], [, b]) => b.views - a.views)
    .slice(0, 5)
    .map(([channel, v]) => ({ channel, ...v }));
}

const PERIODS = [
  { id: "day", label: "오늘" },
  { id: "week", label: "이번 주" },
  { id: "month", label: "이번 달" },
  { id: "all", label: "전체" },
];
const SORTS = [
  { id: "hot", label: "급상승", icon: Flame },
  { id: "views", label: "조회수순", icon: Eye },
  { id: "recent", label: "최신순", icon: Clock },
];

export default function TrendFeed({ mode }) {
  const router = useRouter();
  const accent = mode === "music" ? PALETTE.music : PALETTE.accent;
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [period, setPeriod] = useState("month");
  const [sort, setSort] = useState("hot");
  const [hotTopics, setHotTopics] = useState([]);
  const [customQuery, setCustomQuery] = useState(""); // set when a hot-topic term is clicked

  useEffect(() => {
    setLoading(true);
    const qParam = customQuery ? `&q=${encodeURIComponent(customQuery)}` : "";
    fetch(`/api/youtube-search?mode=${mode}&period=${period}&sort=${sort}${qParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data);
        else { setError(null); setVideos(data.videos || []); }
      })
      .finally(() => setLoading(false));
  }, [mode, period, sort, customQuery]);

  useEffect(() => {
    fetch(`/api/hot-topics?mode=${mode}`)
      .then((r) => r.json())
      .then((d) => setHotTopics(d.topics || []))
      .catch(() => {});
  }, [mode]);

  const keywords = useMemo(() => extractKeywords(videos), [videos]);
  const channels = useMemo(() => extractChannels(videos), [videos]);
  const topVideos = videos.slice(0, 3);

  const summarize = async (video) => {
    setBusyId(video.id);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `${video.title}\n${video.description || ""}`.trim() }),
      });
      const data = await res.json();
      setSummaries((prev) => ({ ...prev, [video.id]: data.summary || "요약 API 키 미설정 (GOOGLE_API_KEY)" }));
    } catch { setSummaries((prev) => ({ ...prev, [video.id]: "요약 실패" })); }
    finally { setBusyId(null); }
  };

  const toCardNews = (video) => {
    const text = summaries[video.id] || `${video.title}\n${video.description || ""}`.trim();
    sessionStorage.setItem("heredium-cardnews-handoff", JSON.stringify({
      docent: text, subject: video.title, mode: "news",
      meta: { press: video.channel, date: String(video.publishedAt || "").slice(0, 10), url: video.url },
    }));
    router.push("/content/cardnews");
  };

  return (
    <div style={{ background: PALETTE.paper, minHeight: "100vh" }}>
      <div className="px-6 md:px-12 py-8" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/trends" className="flex items-center gap-1 mono text-xs mb-6" style={{ color: PALETTE.stone }}>
          <ArrowLeft size={12} /> 트렌드 대시보드로
        </Link>
        <div className="mono text-xs mb-1" style={{ color: accent }}>
          TREND DASHBOARD · {mode === "art" ? "미술" : "음악"} · YOUTUBE
        </div>
        <h1 className="disp text-3xl" style={{ fontWeight: 600, color: PALETTE.ink }}>
          {mode === "art" ? "미술 트렌드" : "음악 트렌드"}
        </h1>

        {customQuery && (
          <div className="flex items-center gap-2 mt-3">
            <span className="mono text-xs px-2.5 py-1 flex items-center gap-2" style={{ background: accent, color: "#141414" }}>
              <Search size={11} /> "{customQuery}" 검색 중
              <button onClick={() => setCustomQuery("")}><X size={12} /></button>
            </span>
            <span className="text-[11px]" style={{ color: PALETTE.stone }}>
              — 아래 목록이 이 키워드 기준 YouTube 검색 결과로 바뀝니다
            </span>
          </div>
        )}

        {/* filters */}
        <div className="flex items-center gap-6 mt-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="mono text-[10px]" style={{ color: PALETTE.stone }}>기간</span>
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className="mono text-xs px-2.5 py-1"
                style={{
                  border: `1px solid ${period === p.id ? accent : "var(--border)"}`,
                  background: period === p.id ? accent : "transparent",
                  color: period === p.id ? "#141414" : PALETTE.stone,
                }}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="mono text-[10px]" style={{ color: PALETTE.stone }}>정렬</span>
            {SORTS.map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => setSort(s.id)}
                  className="mono text-xs px-2.5 py-1 flex items-center gap-1"
                  style={{
                    border: `1px solid ${sort === s.id ? accent : "var(--border)"}`,
                    background: sort === s.id ? accent : "transparent",
                    color: sort === s.id ? "#141414" : PALETTE.stone,
                  }}>
                  <Icon size={11} /> {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading && <div className="px-6 md:px-12 py-10 text-sm" style={{ color: PALETTE.stone }}>불러오는 중...</div>}

      {error && (
        <div className="mx-6 md:mx-12 mt-6 flex items-start gap-2 text-xs p-3" style={{ background: "rgba(139,58,58,0.2)", border: "1px solid rgba(200,100,100,0.4)", color: "#E88080" }}>
          <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            {error.error === "NO_YOUTUBE_KEY" ? "YOUTUBE_API_KEY가 아직 설정되지 않았어요." : error.error}
          </span>
        </div>
      )}

      {!loading && !error && videos.length > 0 && (
        <>
          {/* ── YOUTUBE HOT (own signal) ── */}
          <div className="px-6 md:px-12 py-8" style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
            <div className="mono text-xs mb-1 flex items-center gap-1.5" style={{ color: PALETTE.stone }}>
              <Flame size={12} style={{ color: accent }} /> YOUTUBE 급상승 — {PERIODS.find((p) => p.id === period)?.label} 기준
            </div>
            <div className="text-[10px] mb-4" style={{ color: PALETTE.stone }}>
              아래 목록의 조회수·급상승 계산은 이 YouTube 검색 결과만 기준으로 해요.
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 mono text-[11px] mb-3" style={{ color: accent }}>
                  <TrendingUp size={12} /> 지금 가장 뜨는 영상
                </div>
                <div className="flex flex-col gap-3">
                  {topVideos.map((v, i) => (
                    <a key={v.id} href={v.url} target="_blank" rel="noreferrer" className="flex gap-2">
                      {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: 64, height: 48, objectFit: "cover", flexShrink: 0 }} />}
                      <div className="min-w-0">
                        <div className="text-xs leading-snug line-clamp-2" style={{ color: PALETTE.ink }}>
                          <span className="mono" style={{ color: accent }}>0{i + 1}</span> {v.title}
                        </div>
                        <div className="mono text-[10px] mt-1" style={{ color: PALETTE.stone }}>
                          👁 {formatViews(v.views)} · {v.ageDays}일 전
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mono text-[11px] mb-3" style={{ color: accent }}>
                  <Tv size={12} /> 파워 채널 (조회수 기준)
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {channels.map(({ channel, views }) => (
                    <div key={channel} className="flex items-center gap-2">
                      <div className="text-xs flex-1 truncate" style={{ color: PALETTE.ink }}>{channel}</div>
                      <div className="mono text-[10px]" style={{ color: accent }}>{formatViews(views)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── NEWS-BASED TOPICS (separate signal, different source) ── */}
          <div className="px-6 md:px-12 py-6" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="mono text-xs mb-1 flex items-center gap-1.5" style={{ color: PALETTE.stone }}>
              <Hash size={12} style={{ color: accent }} /> {mode === "art" ? "미술계" : "음악계"} 이슈 키워드 — 뉴스 기반 (YouTube와 다른 소스)
            </div>
            <div className="text-[10px] mb-4" style={{ color: PALETTE.stone }}>
              {mode === "art" ? "한국경제 arte · 해외 아트매거진" : "월간 객석"} 최근 45일 기사 키워드 집계예요. 위 YouTube 결과와는 독립적인 신호라 서로 안 맞을 수 있어요.
              키워드를 누르면 그 이름으로 YouTube를 다시 검색해요.
            </div>
            <div className="flex flex-wrap gap-2">
              {hotTopics.slice(0, 12).map(({ term, count, sample }) => (
                <div key={term} className="flex items-center" style={{ border: "1px solid var(--border)" }}>
                  <button onClick={() => setCustomQuery(term)}
                    className="mono text-xs px-2.5 py-1.5 flex items-center gap-1"
                    style={{ background: customQuery === term ? accent : "transparent", color: customQuery === term ? "#141414" : PALETTE.ink }}>
                    <Search size={10} /> {term}
                  </button>
                  {sample?.url && (
                    <a href={sample.url} target="_blank" rel="noreferrer" className="px-2 py-1.5" style={{ borderLeft: "1px solid var(--border)" }}>
                      <ExternalLink size={11} style={{ color: PALETTE.stone }} />
                    </a>
                  )}
                </div>
              ))}
              {hotTopics.length === 0 && (
                <span className="text-xs" style={{ color: PALETTE.stone }}>뉴스 데이터 불러오는 중...</span>
              )}
            </div>
          </div>

          {/* ── INSTAGRAM-STYLE GRID ── */}
          <div className="px-6 md:px-12 py-8">
            <div className="mono text-xs mb-4" style={{ color: PALETTE.stone }}>전체 목록 ({videos.length}건)</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
              {videos.map((v, idx) => (
                <div key={v.id} style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden" }}>
                    {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    {idx < 3 && sort === "hot" && (
                      <div className="mono" style={{ position: "absolute", top: 6, left: 6, fontSize: 9, background: accent, color: "#141414", padding: "2px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                        <Flame size={9} /> HOT
                      </div>
                    )}
                    <div className="mono" style={{ position: "absolute", bottom: 6, right: 6, fontSize: 9, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "2px 6px" }}>
                      {v.ageDays}일 전
                    </div>
                  </div>
                  <div style={{ padding: 10 }}>
                    <div className="text-xs leading-snug line-clamp-2" style={{ color: PALETTE.ink, minHeight: 32 }}>{v.title}</div>
                    <div className="text-[11px] mt-1" style={{ color: PALETTE.stone }}>{v.channel}</div>
                    <div className="mono text-[10px] mt-1.5 flex items-center gap-2" style={{ color: PALETTE.stone }}>
                      <span className="flex items-center gap-0.5"><Eye size={10} /> {formatViews(v.views)}</span>
                      {v.likes > 0 && <span className="flex items-center gap-0.5"><Heart size={10} /> {formatViews(v.likes)}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <a href={v.url} target="_blank" rel="noreferrer" style={{ color: PALETTE.stone }}>
                        <ExternalLink size={12} />
                      </a>
                      <button onClick={() => summarize(v)} disabled={busyId === v.id}
                        className="mono text-[10px] px-1.5 py-0.5" style={{ border: `1px solid ${PALETTE.stone}`, color: PALETTE.stone }}>
                        {busyId === v.id ? "..." : "요약"}
                      </button>
                      <button onClick={() => toCardNews(v)}
                        className="mono text-[10px] px-1.5 py-0.5" style={{ border: `1px solid ${accent}`, color: accent }}>
                        카드뉴스
                      </button>
                    </div>
                    {summaries[v.id] && (
                      <div className="text-[11px] mt-2 p-1.5" style={{ background: "rgba(227,165,78,0.1)", color: PALETTE.ink, lineHeight: 1.5 }}>
                        {summaries[v.id]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="px-6 md:px-12 py-10 text-sm" style={{ color: PALETTE.stone }}>
          이 기간에는 조건에 맞는 영상이 없어요. 기간을 넓혀보세요.
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Hash, Newspaper, ExternalLink, Wand2, Filter } from "lucide-react";

const PALETTE_ART = { accent: "#e3a54e" };
const PALETTE_MUSIC = { accent: "#c35131" };
const BASE = { paper: "var(--surface)", ink: "var(--text)", stone: "#C9C5BE" };

const SOURCE_LABELS = {
  heredium: "헤레디움", hankyung: "한국경제 arte", global: "해외 아트매거진",
  "music-gaeksuk": "객석", "music-hankyung": "한경", "music-daum": "다음 음악", "music-munhwa": "문화일보 공연",
  all: "전체",
};
const SOURCE_COLORS = {
  heredium: "#e3a54e", hankyung: "#c35131", global: "#8A6A3F",
  "music-gaeksuk": "#c35131", "music-hankyung": "#B4574A", "music-daum": "#8A4A3F", "music-munhwa": "#6B3A30",
};
const CATEGORY_SOURCES = {
  art: ["all", "heredium", "hankyung", "global"],
  music: ["all", "music-gaeksuk", "music-hankyung", "music-daum", "music-munhwa"],
};

function thisYear(dateStr) {
  return dateStr && String(dateStr).startsWith("2026");
}
function thisMonth(dateStr) {
  return dateStr && String(dateStr).slice(0, 7) === "2026-07";
}

function extractKeywords(articles) {
  const freq = {};
  const stop = new Set(["미술","작품","전시","갤러리","작가","art","the","and","of","in","a","an","to","for","with","is","음악","공연","연주"]);
  articles.forEach((a) => {
    (a.keywords || "").split(/[,，\s]+/).forEach((w) => {
      const t = w.trim().toLowerCase().replace(/[.,]/g,"");
      if (t.length > 1 && !stop.has(t)) freq[t] = (freq[t] || 0) + 1;
    });
  });
  return Object.entries(freq).sort(([,a],[,b]) => b-a).slice(0,14).map(([word,count]) => ({ word, count }));
}

function topPress(articles) {
  const freq = {};
  articles.forEach((a) => { if (a.press) freq[a.press] = (freq[a.press] || 0) + 1; });
  return Object.entries(freq).sort(([,a],[,b]) => b-a).slice(0,5).map(([press,count]) => ({ press, count }));
}

export default function NewsDashboard() {
  const router = useRouter();
  const [category, setCategory] = useState("art"); // "art" | "music"
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [srcFilter, setSrcFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyIdx, setBusyIdx] = useState(null);
  const [summaries, setSummaries] = useState({});

  const PALETTE = { ...BASE, ...(category === "art" ? PALETTE_ART : PALETTE_MUSIC) };

  useEffect(() => {
    setLoading(true);
    setSrcFilter("all");
    fetch(`/api/news-dashboard?category=${category}`)
      .then((r) => r.json())
      .then((d) => setArticles(d.articles || []))
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = useMemo(() => {
    let r = articles;
    if (srcFilter !== "all") r = r.filter((a) => a.source === srcFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((a) =>
        a.title?.toLowerCase().includes(q) ||
        a.press?.toLowerCase().includes(q) ||
        a.keywords?.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [articles, srcFilter, search]);

  const yearCount = useMemo(() => filtered.filter((a) => thisYear(a.publishedAt || a.loadedAt)).length, [filtered]);
  const monthCount = useMemo(() => filtered.filter((a) => thisMonth(a.publishedAt || a.loadedAt)).length, [filtered]);
  const keywords = useMemo(() => extractKeywords(filtered), [filtered]);
  const presses = useMemo(() => topPress(filtered), [filtered]);
  const latest = filtered.slice(0, 5);

  const srcCounts = useMemo(() => {
    const c = {};
    articles.forEach((a) => { c[a.source] = (c[a.source] || 0) + 1; });
    return c;
  }, [articles]);

  const summarize = async (article, idx) => {
    setBusyIdx(idx);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `${article.title}\n${article.summary || ""}`.trim() }),
      });
      const data = await res.json();
      setSummaries((prev) => ({ ...prev, [idx]: data.summary || "요약 API 키 미설정 (GOOGLE_API_KEY)" }));
    } catch {
      setSummaries((prev) => ({ ...prev, [idx]: "요약 실패" }));
    } finally {
      setBusyIdx(null);
    }
  };

  const toCardNews = (article, idx) => {
    const text = summaries[idx] || `${article.title}\n${article.summary || ""}`.trim();
    sessionStorage.setItem(
      "heredium-cardnews-handoff",
      JSON.stringify({
        docent: text, subject: article.title, mode: "news",
        meta: { press: article.press, date: article.publishedAt || article.loadedAt, url: article.url },
      })
    );
    router.push("/content/cardnews");
  };

  return (
    <div style={{ background: PALETTE.paper, color: PALETTE.ink, minHeight: "100vh" }}>

      {/* ── HEADER ── */}
      <div className="px-6 md:px-12 py-8" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="mono text-xs mb-1" style={{ color: PALETTE.accent }}>HEREDIUM · NEWS DASHBOARD</div>
        <h1 className="disp text-3xl" style={{ fontWeight: 600 }}>뉴스 아카이브</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {category === "art"
            ? "헤레디움 기사모음 · 한국경제 arte · 해외 아트매거진"
            : "객석 (클래식 음악 전문지)"} — 자동 수집 · 매일 업데이트
        </p>

        {/* category toggle — art / music never mix */}
        <div className="flex gap-2 mt-5">
          {[["art","미술"],["music","음악"]].map(([key, label]) => (
            <button key={key} onClick={() => setCategory(key)}
              className="mono text-sm px-4 py-2"
              style={{
                border: `1px solid ${category === key ? (key === "art" ? PALETTE_ART.accent : PALETTE_MUSIC.accent) : "var(--border)"}`,
                background: category === key ? (key === "art" ? PALETTE_ART.accent : PALETTE_MUSIC.accent) : "transparent",
                color: category === key ? "#141414" : "var(--muted)",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="px-6 md:px-12 py-10 text-sm" style={{ color: PALETTE.stone }}>불러오는 중...</div>}

      {!loading && (
        <>
          {/* ── STATS ── */}
          <div className="px-6 md:px-12 py-6 grid grid-cols-2 md:grid-cols-4 gap-4" style={{ background: "#F0EDE4", borderBottom: "1px solid var(--border)" }}>
            <Stat label="전체 기사" value={articles.length} accent={PALETTE.accent} />
            <Stat label="금년 발행" value={yearCount} accent={PALETTE.accent} />
            <Stat label="금월 발행" value={monthCount} accent={PALETTE.accent} />
            <Stat label="수집 채널" value={CATEGORY_SOURCES[category].length - 1} accent={PALETTE.accent} />
          </div>

          {/* ── SOURCE TABS ── */}
          <div className="px-6 md:px-12 pt-6 flex items-center gap-2 flex-wrap">
            {CATEGORY_SOURCES[category].map((src) => (
              <button
                key={src}
                onClick={() => setSrcFilter(src)}
                className="mono text-xs px-3 py-1.5"
                style={{
                  border: `1px solid ${srcFilter === src ? PALETTE.accent : "#E2DCCB"}`,
                  background: srcFilter === src ? PALETTE.accent : "white",
                  color: srcFilter === src ? "white" : "#17170F",
                }}
              >
                {SOURCE_LABELS[src]} {src !== "all" && `(${srcCounts[src] ?? 0})`}
              </button>
            ))}
          </div>

          {/* ── INSIGHT PANELS ── */}
          <div className="px-6 md:px-12 py-6 grid gap-6 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mono text-[11px] mb-3" style={{ color: PALETTE.accent }}>
                <Newspaper size={12} /> 최신 기사
              </div>
              {latest.map((a, i) => (
                <div key={i} className="mb-2">
                  <a href={a.url || "#"} target="_blank" rel="noreferrer"
                    className="text-xs leading-snug" style={{ color: PALETTE.ink }}>
                    <span className="mono text-[10px] mr-1 px-1" style={{ background: SOURCE_COLORS[a.source] || PALETTE.stone, color: "white" }}>
                      {SOURCE_LABELS[a.source]}
                    </span>
                    {a.title}
                  </a>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center gap-2 mono text-[11px] mb-3" style={{ color: PALETTE.accent }}>
                <Hash size={12} /> 주요 키워드
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map(({ word, count }) => (
                  <span key={word} className="mono text-[11px] px-2 py-0.5"
                    style={{ background: PALETTE.accent, color: "white", opacity: 0.45 + (count / (keywords[0]?.count || 1)) * 0.55 }}>
                    {word} ×{count}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mono text-[11px] mb-3" style={{ color: PALETTE.accent }}>
                <TrendingUp size={12} /> 파워 채널 TOP 5
              </div>
              {presses.map(({ press, count }, i) => (
                <div key={press} className="flex items-center gap-2 mb-2">
                  <span className="mono text-[10px] w-4" style={{ color: PALETTE.stone }}>{i + 1}</span>
                  <span className="text-xs flex-1 truncate">{press}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(count, 10) }).map((_, j) => (
                      <div key={j} style={{ width: 6, height: 6, background: PALETTE.accent, opacity: 0.6 }} />
                    ))}
                    {count > 10 && <span className="text-[10px]" style={{ color: PALETTE.stone }}>+{count-10}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SEARCH + TABLE ── */}
          <div className="px-6 md:px-12 pb-16" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 py-4">
              <Filter size={14} style={{ color: PALETTE.stone }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="제목 · 언론사 · 키워드 검색..."
                className="text-sm px-3 py-2 flex-1"
                style={{ border: "1px solid var(--border)", background: "var(--surface2)", maxWidth: 360 }}
              />
              <span className="mono text-xs" style={{ color: PALETTE.stone }}>{filtered.length}건</span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    {["출처","발행일","언론사","제목","키워드","요약",""].map((h) => (
                      <th key={h} className="mono text-[10px] px-2 py-2" style={{ color: PALETTE.stone, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((a, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[#242019]">
                      <td className="px-2 py-2">
                        <span className="mono text-[10px] px-1" style={{ background: SOURCE_COLORS[a.source] || PALETTE.stone, color: "white", whiteSpace: "nowrap" }}>
                          {SOURCE_LABELS[a.source]}
                        </span>
                      </td>
                      <td className="mono px-2 py-2" style={{ color: PALETTE.stone, whiteSpace: "nowrap" }}>
                        {String(a.publishedAt || a.loadedAt || "").slice(0, 10)}
                      </td>
                      <td className="px-2 py-2" style={{ whiteSpace: "nowrap" }}>{a.press}</td>
                      <td className="px-2 py-2" style={{ maxWidth: 280 }}>
                        <a href={a.url || "#"} target="_blank" rel="noreferrer" className="leading-snug" style={{ color: PALETTE.ink }}>
                          {a.title}
                        </a>
                      </td>
                      <td className="px-2 py-2" style={{ color: "var(--muted)", maxWidth: 160, overflow: "hidden" }}>
                        {(a.keywords || "").slice(0, 40)}
                      </td>
                      <td className="px-2 py-2" style={{ color: "var(--muted)", maxWidth: 240 }}>
                        {summaries[idx] ? (
                          <span style={{ color: "#7B9EA8" }}>{summaries[idx]}</span>
                        ) : (
                          <>{(a.summary || "").slice(0, 80)}{(a.summary || "").length > 80 ? "..." : ""}</>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          {a.url && (
                            <a href={a.url} target="_blank" rel="noreferrer">
                              <ExternalLink size={11} style={{ color: PALETTE.stone }} />
                            </a>
                          )}
                          <button onClick={() => summarize(a, idx)} disabled={busyIdx === idx}
                            className="mono text-[10px] px-1.5 py-0.5" style={{ border: `1px solid ${PALETTE.stone}`, color: PALETTE.stone, whiteSpace: "nowrap" }}>
                            {busyIdx === idx ? "..." : "요약"}
                          </button>
                          <button onClick={() => toCardNews(a, idx)}
                            className="mono text-[10px] px-1.5 py-0.5" style={{ border: `1px solid ${PALETTE.accent}`, color: PALETTE.accent, whiteSpace: "nowrap" }}>
                            카드뉴스
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 100 && (
                <div className="mono text-xs mt-3" style={{ color: PALETTE.stone }}>
                  상위 100건만 표시 중 (총 {filtered.length}건) — 검색어로 좁혀보세요
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="disp text-3xl" style={{ fontWeight: 600, color: accent }}>{value.toLocaleString()}</div>
      <div className="mono text-[11px] mt-1" style={{ color: "#17170F" }}>{label}</div>
    </div>
  );
}

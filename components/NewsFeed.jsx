"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wand2, ExternalLink, Info } from "lucide-react";

const PALETTE = { paper: "var(--surface)", ink: "var(--text)", stone: "#C9C5BE", accent: "#7B9EA8" };

export default function NewsFeed() {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyIdx, setBusyIdx] = useState(null);
  const [summaries, setSummaries] = useState({});

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data);
        else setArticles(data.articles || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const summarize = async (article, idx) => {
    setBusyIdx(idx);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `${article.title}\n${article.body || ""}`.trim() }),
      });
      const data = await res.json();
      setSummaries((prev) => ({
        ...prev,
        [idx]: data.summary || "요약 API 키가 설정되지 않았어요 (GOOGLE_API_KEY)",
      }));
    } catch {
      setSummaries((prev) => ({ ...prev, [idx]: "요약에 실패했어요" }));
    } finally {
      setBusyIdx(null);
    }
  };

  const toCardNews = (article, idx) => {
    const text = summaries[idx] || `${article.title}\n${article.body || ""}`.trim();
    sessionStorage.setItem(
      "heredium-cardnews-handoff",
      JSON.stringify({
        docent: text,
        subject: article.title,
        mode: "news",
        meta: { press: article.press, date: article.date, url: article.url },
      })
    );
    router.push("/content/cardnews");
  };

  return (
    <div style={{ background: PALETTE.paper, minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-6 md:px-0 py-10">
        <Link href="/content" className="flex items-center gap-1 mono text-xs mb-8" style={{ color: PALETTE.stone }}>
          <ArrowLeft size={12} /> 콘텐츠 제작 목록으로
        </Link>

        <div className="mono text-xs" style={{ color: PALETTE.accent }}>NEWS · 헤레디움_기사모음</div>
        <h1 className="disp text-2xl mt-1 mb-6" style={{ fontWeight: 600, color: PALETTE.ink }}>
          뉴스 기반 카드뉴스
        </h1>

        {loading && <div className="text-sm" style={{ color: PALETTE.stone }}>불러오는 중...</div>}

        {error && (
          <div className="flex items-start gap-2 text-xs p-3" style={{ background: "rgba(139,58,58,0.2)", border: "1px solid rgba(200,100,100,0.4)", color: "#c35131" }}>
            <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{error.message || error.error}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {articles.map((a, idx) => (
            <div key={idx} className="p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="mono text-[11px]" style={{ color: PALETTE.stone }}>{a.date}</span>
                <span className="mono text-[11px]" style={{ color: PALETTE.stone }}>· {a.press}</span>
              </div>
              <div className="text-sm" style={{ fontWeight: 600, color: PALETTE.ink }}>{a.title}</div>
              {a.body && (
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {a.body.slice(0, 100)}{a.body.length > 100 ? "..." : ""}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                {a.url && (
                  <a href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: PALETTE.stone }}>
                    <ExternalLink size={11} /> 기사 원문
                  </a>
                )}
                <button
                  onClick={() => summarize(a, idx)}
                  disabled={busyIdx === idx}
                  className="flex items-center gap-1 mono text-[11px] px-2 py-1"
                  style={{ border: `1px solid ${PALETTE.stone}`, color: PALETTE.stone }}
                >
                  <Wand2 size={11} /> {busyIdx === idx ? "요약 중..." : "요약하기"}
                </button>
                <button
                  onClick={() => toCardNews(a, idx)}
                  className="flex items-center gap-1 mono text-[11px] px-2 py-1"
                  style={{ border: `1px solid ${PALETTE.accent}`, color: PALETTE.accent }}
                >
                  <Wand2 size={11} /> 카드뉴스 만들기
                </button>
              </div>
              {summaries[idx] && (
                <div className="text-xs mt-2 p-2" style={{ background: "rgba(123,158,168,0.1)", color: "var(--text)", lineHeight: 1.6 }}>
                  {summaries[idx]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

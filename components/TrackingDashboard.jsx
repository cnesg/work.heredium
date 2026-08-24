"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, ExternalLink, Save, BarChart3, Eye, RefreshCw } from "lucide-react";
import { loadSection, saveSection } from "../lib/supabase";
import { concerts, exhibitions } from "../lib/data";

const ACCENT = "#c35131";
const SURFACE = "var(--surface2)";
const BORDER = "var(--border)";
const TEXT = "var(--text)";
const MUTED = "#C9C5BE";

const PLATFORM_COLORS = {
  Instagram: "#c35131", TikTok: "#7B9EA8", "YouTube Shorts": "#B4574A",
  "네이버 블로그": "#5B8C6A", 기타: "#8A8680",
};

const ALL = [...exhibitions, ...concerts];
const todayKey = () => new Date().toISOString().slice(0, 10);

function isYouTube(url) {
  return /youtube\.com|youtu\.be/.test(url || "");
}

export default function TrackingDashboard() {
  const [projectId, setProjectId] = useState(exhibitions[0]?.id || "");
  const [posts, setPosts] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState("");
  const [ytBusy, setYtBusy] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    (async () => {
      const sns = await loadSection(projectId, "sns", {});
      const list = [];
      (sns.campaigns || []).forEach((c) => {
        (c.published || []).forEach((p) => {
          if (p.url) list.push({ ...p, campaign: c.name });
        });
      });
      setPosts(list);
      const tr = await loadSection(projectId, "tracking", { metrics: {}, history: {} });
      setMetrics(tr.metrics || {});
      setHistory(tr.history || {});
      setLoading(false);
    })();
  }, [projectId]);

  const upd = (id, patch) =>
    setMetrics((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  // pull real numbers straight from YouTube for posts that are YouTube links
  const autoFetchYoutube = async (post) => {
    setYtBusy(post.id);
    try {
      const res = await fetch(`/api/youtube-stats?url=${encodeURIComponent(post.url)}`);
      const data = await res.json();
      if (data.error) {
        setSaveMsg(`자동 갱신 실패: ${data.error}`);
      } else {
        upd(post.id, { views: data.views, likes: data.likes, comments: data.comments });
        setSaveMsg(`✓ ${post.platform} 실시간 데이터 반영됨`);
      }
    } catch (e) {
      setSaveMsg(`자동 갱신 실패: ${e.message}`);
    } finally {
      setYtBusy(null);
    }
  };

  const save = async () => {
    setSaveMsg("저장 중...");
    // snapshot today's numbers into history so we can show day-over-day deltas
    const nextHistory = { ...history };
    const today = todayKey();
    posts.forEach((p) => {
      const m = metrics[p.id];
      if (!m) return;
      const list = nextHistory[p.id] ? [...nextHistory[p.id]] : [];
      const idx = list.findIndex((h) => h.date === today);
      const snap = { date: today, likes: Number(m.likes) || 0, comments: Number(m.comments) || 0,
        shares: Number(m.shares) || 0, saves: Number(m.saves) || 0, views: Number(m.views) || 0 };
      if (idx >= 0) list[idx] = snap; else list.push(snap);
      nextHistory[p.id] = list;
    });
    setHistory(nextHistory);
    const r = await saveSection(projectId, "tracking", { metrics, history: nextHistory });
    setSaveMsg(r?.ok ? "✓ 저장됨" : `저장 실패: ${r?.error || "오류"}`);
  };

  const deltaFor = (postId, field) => {
    const list = history[postId];
    if (!list || list.length < 2) return null;
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const cur = Number(metrics[postId]?.[field]) || 0;
    const base = prev[field] || 0;
    const diff = cur - base;
    return { diff, prevDate: prev.date };
  };

  const byPlatform = useMemo(() => {
    const agg = {};
    posts.forEach((p) => {
      const m = metrics[p.id] || {};
      if (!agg[p.platform]) agg[p.platform] = { posts: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
      agg[p.platform].posts += 1;
      agg[p.platform].likes += Number(m.likes) || 0;
      agg[p.platform].comments += Number(m.comments) || 0;
      agg[p.platform].shares += Number(m.shares) || 0;
      agg[p.platform].saves += Number(m.saves) || 0;
    });
    return agg;
  }, [posts, metrics]);

  const totals = useMemo(() => {
    const t = { likes: 0, comments: 0, shares: 0, saves: 0, views: 0 };
    posts.forEach((p) => {
      const m = metrics[p.id] || {};
      t.likes += Number(m.likes) || 0; t.comments += Number(m.comments) || 0;
      t.shares += Number(m.shares) || 0; t.saves += Number(m.saves) || 0;
      t.views += Number(m.views) || 0;
    });
    return t;
  }, [posts, metrics]);

  const maxEngagement = Math.max(1, ...Object.values(byPlatform).map((v) => v.likes + v.comments + v.shares + v.saves));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 40px" }}>
      <div className="mono" style={{ fontSize: 10, color: ACCENT, letterSpacing: "0.1em" }}>SNS TRACKING</div>
      <h1 className="disp" style={{ fontSize: 28, fontWeight: 500, color: TEXT, marginTop: 4, marginBottom: 6 }}>홍보 결과</h1>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>
        YouTube는 실제 수치를 자동으로 가져오고, 그 외 채널은 직접 입력해요. 매번 저장하면 전일 대비 증감이 표시돼요.
      </p>

      <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
        style={{ fontSize: 12, padding: "8px 12px", minWidth: 240, marginBottom: 24 }}>
        <optgroup label="전시">{exhibitions.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</optgroup>
        <optgroup label="음악회">{concerts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</optgroup>
      </select>

      {loading && <div style={{ color: MUTED, fontSize: 13 }}>불러오는 중...</div>}

      {!loading && posts.length === 0 && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, padding: 20, fontSize: 12, color: MUTED, maxWidth: 520, lineHeight: 1.7 }}>
          아직 등록된 배포 링크가 없어요. <b style={{ color: TEXT }}>SNS 기획</b> 탭의 5단계에서 게시물 URL을 추가하면 여기에 나타납니다.
        </div>
      )}

      {!loading && posts.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 26, maxWidth: 900 }}>
            <Kpi icon={<Eye size={15} />} label="조회수" value={totals.views} />
            <Kpi icon={<Heart size={15} />} label="좋아요" value={totals.likes} />
            <Kpi icon={<MessageCircle size={15} />} label="댓글" value={totals.comments} />
            <Kpi icon={<Share2 size={15} />} label="공유" value={totals.shares} />
            <Kpi icon={<Bookmark size={15} />} label="저장" value={totals.saves} />
          </div>

          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, padding: "20px 24px", marginBottom: 24 }}>
            <div className="mono" style={{ fontSize: 10, color: MUTED, marginBottom: 18, display: "flex", alignItems: "center", gap: 6 }}>
              <BarChart3 size={12} /> 채널별 반응
            </div>
            {Object.entries(byPlatform).map(([plat, v]) => {
              const total = v.likes + v.comments + v.shares + v.saves;
              const color = PLATFORM_COLORS[plat] || ACCENT;
              return (
                <div key={plat} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: TEXT, marginBottom: 6 }}>
                    <span>{plat} <span className="mono" style={{ color: MUTED, fontSize: 10 }}>· {v.posts}건</span></span>
                    <span className="mono" style={{ fontSize: 11, color: MUTED }}>{total.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", height: 14, width: `${(total / maxEngagement) * 100}%`, minWidth: 2 }}>
                    <Seg v={v.likes} t={total} c={color} o={1} />
                    <Seg v={v.comments} t={total} c={color} o={0.75} />
                    <Seg v={v.shares} t={total} c={color} o={0.5} />
                    <Seg v={v.saves} t={total} c={color} o={0.3} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mono" style={{ fontSize: 10, color: MUTED, marginBottom: 10 }}>게시물별 기록</div>
          {posts.map((p) => {
            const m = metrics[p.id] || {};
            const color = PLATFORM_COLORS[p.platform] || ACCENT;
            const yt = isYouTube(p.url);
            return (
              <div key={p.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 10, background: color, color: "#fff", padding: "2px 7px" }}>{p.platform}</span>
                  <span className="mono" style={{ fontSize: 10, color: MUTED }}>{p.campaign}</span>
                  {p.postedAt && <span className="mono" style={{ fontSize: 10, color: MUTED }}>· {p.postedAt}</span>}
                  <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: ACCENT, display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
                    <ExternalLink size={11} /> 게시물 열기
                  </a>
                  {yt && (
                    <button onClick={() => autoFetchYoutube(p)} disabled={ytBusy === p.id}
                      className="mono" style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4, border: `1px solid ${ACCENT}`, color: ACCENT, padding: "3px 8px", background: "transparent" }}>
                      <RefreshCw size={10} className={ytBusy === p.id ? "spin-slow" : ""} /> {ytBusy === p.id ? "가져오는 중..." : "YouTube 자동 갱신"}
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: yt ? "repeat(5,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 10 }}>
                  {yt && <Num label="조회수" icon={<Eye size={11} />} value={m.views} onChange={(v) => upd(p.id, { views: v })} delta={deltaFor(p.id, "views")} />}
                  <Num label="좋아요" icon={<Heart size={11} />} value={m.likes} onChange={(v) => upd(p.id, { likes: v })} delta={deltaFor(p.id, "likes")} />
                  <Num label="댓글" icon={<MessageCircle size={11} />} value={m.comments} onChange={(v) => upd(p.id, { comments: v })} delta={deltaFor(p.id, "comments")} />
                  <Num label="공유" icon={<Share2 size={11} />} value={m.shares} onChange={(v) => upd(p.id, { shares: v })} delta={deltaFor(p.id, "shares")} />
                  <Num label="저장" icon={<Bookmark size={11} />} value={m.saves} onChange={(v) => upd(p.id, { saves: v })} delta={deltaFor(p.id, "saves")} />
                </div>

                <div className="mono" style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>반응 코멘트</div>
                <textarea value={m.note || ""} onChange={(e) => upd(p.id, { note: e.target.value })}
                  rows={2} placeholder="어떤 반응이었는지, 무엇이 잘 통했는지 기록해두세요"
                  style={{ width: "100%", fontSize: 12, padding: "8px 10px", lineHeight: 1.6 }} />
              </div>
            );
          })}

          <button onClick={save} className="mono"
            style={{ background: ACCENT, color: "#fff", border: "none", padding: "12px 24px", fontSize: 12, cursor: "pointer", marginTop: 12 }}>
            <Save size={13} style={{ display: "inline", marginRight: 5 }} /> 성과 저장하기
          </button>
          {saveMsg && (
            <div className="mono" style={{ fontSize: 11, marginTop: 10, color: saveMsg.startsWith("✓") ? ACCENT : "#E88080" }}>{saveMsg}</div>
          )}
        </>
      )}
    </div>
  );
}

function Seg({ v, t, c, o }) {
  if (!v) return null;
  return <div style={{ width: `${(v / t) * 100}%`, background: c, opacity: o }} />;
}

function Kpi({ icon, label, value }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED, marginBottom: 8 }}>
        {icon}<span className="mono" style={{ fontSize: 10 }}>{label}</span>
      </div>
      <div className="disp" style={{ fontSize: 26, fontWeight: 600, color: TEXT }}>{value.toLocaleString()}</div>
    </div>
  );
}

function Num({ label, icon, value, onChange, delta }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9, color: MUTED, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
        {icon} {label}
      </div>
      <input type="number" inputMode="numeric" min={0} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        placeholder="0" style={{ width: "100%", fontSize: 14, padding: "8px 8px" }} />
      {delta && delta.diff !== 0 && (
        <div className="mono" style={{ fontSize: 10, marginTop: 3, color: delta.diff > 0 ? "#6FA88A" : "#E88080" }}>
          {delta.diff > 0 ? "+" : ""}{delta.diff} ({delta.prevDate} 대비)
        </div>
      )}
    </div>
  );
}

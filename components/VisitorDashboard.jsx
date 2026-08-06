"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Calendar, Clock, RefreshCw } from "lucide-react";

const ACCENT = "#c35131";
const ACCENT2 = "#7B9EA8";
const SURFACE2 = "#1E1E1E";
const BORDER = "#2A2A2A";
const MUTED = "#B4AFA7";
const TEXT = "#F0EDE8";

const SHOWS = [
  { id: "lambert", label: "이봉 랑베르: 예술가의 곁에서", period: "2026.05 – 2026.07" },
  { id: "shiota", label: "시오타 치하루: 기억의 빛 속으", period: "2026.08 –" },
];

export default function VisitorDashboard() {
  const [show, setShow] = useState("lambert");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setData(null);
    fetch(`/api/visitors?show=${show}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setData(d.error ? null : d);
        setUpdatedAt(new Date());
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const filtered = useMemo(() => {
    if (!data) return null;
    if (range === "all") return data;
    const cutMonths = range === "3m" ? 3 : range === "1m" ? 1 : 99;
    const cutIdx = Math.max(0, data.dates.length - cutMonths * 30);
    const dates = data.dates.slice(cutIdx);
    const dailyTotals = data.dailyTotals.slice(cutIdx);
    const total = dailyTotals.reduce((a, b) => a + b, 0);
    const peak = Math.max(...dailyTotals);
    const avg = Math.round(total / Math.max(dates.length, 1));
    return { ...data, dates, dailyTotals, total, peak, avg };
  }, [data, range]);

  const showInfo = SHOWS.find((s) => s.id === show);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 40px" }}>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div className="mono" style={{ fontSize: 10, color: MUTED, letterSpacing: "0.1em", marginBottom: 6 }}>
          VISITOR ANALYTICS
        </div>
        <h1 className="disp" style={{ fontSize: 28, fontWeight: 500, color: TEXT }}>관람객 분석</h1>
        <p style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{showInfo?.period}</p>
      </motion.div>

      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {SHOWS.map((s) => (
          <motion.button
            key={s.id}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShow(s.id)}
            style={{
              padding: "7px 16px", fontSize: 11, fontFamily: "IBM Plex Mono",
              border: `1px solid ${show === s.id ? ACCENT : BORDER}`,
              background: show === s.id ? "rgba(195,81,49,0.14)" : SURFACE2,
              color: show === s.id ? ACCENT : MUTED, cursor: "pointer",
            }}
          >
            {s.label}
          </motion.button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <motion.button whileTap={{ scale: 0.95, rotate: 180 }} onClick={fetchData} disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            fontSize: 11, fontFamily: "IBM Plex Mono",
            border: `1px solid ${BORDER}`, background: "transparent",
            color: MUTED, cursor: "pointer",
          }}>
          <motion.span animate={loading ? { rotate: 360 } : {}} transition={loading ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}>
            <RefreshCw size={12} />
          </motion.span>
          시트에서 새로 불러오기
        </motion.button>
        {updatedAt && (
          <span className="mono" style={{ fontSize: 10, color: MUTED }}>
            마지막 갱신 {updatedAt.toLocaleTimeString("ko-KR")}
          </span>
        )}
      </div>

      {loading && (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }}
          style={{ color: MUTED, fontSize: 13 }}>불러오는 중...</motion.div>
      )}

      {!loading && show === "shiota" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: SURFACE2, border: `1px solid ${BORDER}`, padding: 32, maxWidth: 480 }}>
          <div className="mono" style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>PENDING</div>
          <p style={{ fontSize: 13, color: MUTED }}>
            시오타 치하루 전시 관람객 데이터는 아직 수집 전이에요. 전시 시작 후 시트 링크를 공유해주시면 바로 연결할게요.
          </p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {filtered && (
          <motion.div key={show + range} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              <KpiCard icon={<Users size={16} />} label="총 관람객" value={filtered.total} unit="명" />
              <KpiCard icon={<TrendingUp size={16} />} label="최다 방문일" value={filtered.peak} unit="명" sub={filtered.peakDate} />
              <KpiCard icon={<Calendar size={16} />} label="일 평균" value={filtered.avg} unit="명/일" />
              <KpiCard icon={<Clock size={16} />} label="운영 일수" value={filtered.dates.length} unit="일" />
            </div>

            {/* range filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[["all","전체"],["3m","최근 3개월"],["1m","최근 1개월"]].map(([key, lbl]) => (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRange(key)}
                  style={{
                    padding: "4px 12px", fontSize: 10, fontFamily: "IBM Plex Mono",
                    border: `1px solid ${range === key ? ACCENT : BORDER}`,
                    background: range === key ? "rgba(195,81,49,0.12)" : "transparent",
                    color: range === key ? ACCENT : MUTED, cursor: "pointer",
                  }}
                >
                  {lbl}
                </motion.button>
              ))}
            </div>

            <ChartSection title="일별 관람객">
              <BarChart dates={filtered.dates} values={filtered.dailyTotals} accent={ACCENT} />
            </ChartSection>

            {data?.weeklyTotals?.length > 0 && (
              <ChartSection title="주별 관람객">
                <BarChart
                  dates={data.weeklyTotals.map((w) => w.week)}
                  values={data.weeklyTotals.map((w) => w.count)}
                  accent={ACCENT2}
                  labelFull
                />
              </ChartSection>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 28 }}>
              <BreakdownCard title="시간대별" icon={<Clock size={13} />}
                items={data.hourlyAvg.map((h) => ({ label: h.slot, count: h.total }))} accent={ACCENT} />
              <BreakdownCard title="연령대별" icon={<Users size={13} />}
                items={data.ageDist} accent={ACCENT2} />
              <BreakdownCard title="성별" icon={<Users size={13} />}
                items={data.genderDist} accent="#B08AC7" />
              <BreakdownCard title="국적별" icon={<Users size={13} />}
                items={data.natDist} accent="#6FA88A" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── SUB COMPONENTS ─────────────────────────────────── */

function CountUp({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = display;
    const duration = 700;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

function KpiCard({ icon, label, value, unit, sub }) {
  return (
    <motion.div
      whileHover={{ y: -3, borderColor: ACCENT }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ background: SURFACE2, border: `1px solid ${BORDER}`, padding: "20px 22px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED, marginBottom: 12 }}>
        {icon}
        <span className="mono" style={{ fontSize: 11, letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="disp" style={{ fontSize: 36, fontWeight: 600, color: TEXT }}>
          <CountUp value={value} />
        </span>
        <span className="mono" style={{ fontSize: 12, color: MUTED }}>{unit}</span>
      </div>
      {sub && <div className="mono" style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{sub}</div>}
    </motion.div>
  );
}

function ChartSection({ title, children }) {
  return (
    <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, padding: "20px 24px", marginBottom: 16 }}>
      <div className="mono" style={{ fontSize: 11, color: MUTED, letterSpacing: "0.08em", marginBottom: 18 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function BarChart({ dates, values, accent, labelFull }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...values, 1);
  const barW = Math.max(10, Math.min(36, Math.floor(720 / Math.max(dates.length, 1)) - 4));

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, minWidth: dates.length * (barW + 4) }}>
        {values.map((v, i) => {
          const h = Math.max(2, (v / max) * 92);
          const isHover = hover === i;
          return (
            <div
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, position: "relative" }}
            >
              <AnimatePresence>
                {isHover && v > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    className="mono"
                    style={{
                      position: "absolute", bottom: h + 24, left: "50%", translateX: "-50%",
                      transform: "translateX(-50%)", background: accent, color: "#141414",
                      fontSize: 11, fontWeight: 600, padding: "3px 8px", whiteSpace: "nowrap", zIndex: 10,
                    }}
                  >
                    {v}명
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mono" style={{ fontSize: 12, fontWeight: isHover ? 700 : 400, color: isHover ? accent : MUTED, opacity: v > 0 ? 1 : 0 }}>
                {v > 0 ? v : ""}
              </div>

              <motion.div
                initial={{ height: 0 }}
                animate={{ height: h }}
                transition={{ delay: i * 0.012, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ scale: 1.08 }}
                style={{
                  width: barW,
                  background: accent,
                  opacity: isHover ? 1 : 0.65 + (v / max) * 0.35,
                  cursor: "pointer",
                  transformOrigin: "bottom",
                }}
              />

              <div className="mono" style={{
                fontSize: 11, color: isHover ? accent : MUTED, fontWeight: isHover ? 600 : 400,
                writingMode: labelFull ? "horizontal-tb" : "vertical-rl",
                transform: labelFull ? "none" : "rotate(180deg)",
                whiteSpace: "nowrap",
              }}>
                {dates[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownCard({ title, icon, items, accent }) {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  const [hover, setHover] = useState(null);
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{ background: SURFACE2, border: `1px solid ${BORDER}`, padding: "20px 22px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED, marginBottom: 16 }}>
        {icon}
        <span className="mono" style={{ fontSize: 11 }}>{title}</span>
      </div>
      {items.map((item, idx) => {
        const key = item.label;
        const pct = (item.count / total) * 100;
        const isHover = hover === key;
        return (
          <div key={key} style={{ marginBottom: 12 }}
            onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13, color: isHover ? accent : TEXT, fontWeight: isHover ? 600 : 400 }}>
              <span>{key}</span>
              <span className="mono" style={{ color: isHover ? accent : MUTED, fontSize: 11 }}>
                {item.count} ({Math.round(pct)}%)
              </span>
            </div>
            <div style={{ height: 5, background: BORDER, width: "100%" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: idx * 0.06, duration: 0.6, ease: "easeOut" }}
                style={{ height: 5, background: accent }}
              />
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

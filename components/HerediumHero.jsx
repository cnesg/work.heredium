"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Disc3, Frame, ChevronLeft, ChevronRight, MapPin, CalendarDays, ArrowRight, Pencil } from "lucide-react";
import { concerts, exhibitions } from "../lib/data";
import { loadAllSections } from "../lib/supabase";

const PALETTE = {
  paper: "var(--surface)",
  ink: "var(--text)",
  stone: "#C9C5BE",
  art: "#c35131",
  music: "#c35131",
  vinyl: "#0A0A0A",
};

export default function HerediumOpsHero() {
  const router = useRouter();
  const [mode, setMode] = useState("music"); // 'music' | 'art'
  const [active, setActive] = useState(0);
  const [overrides, setOverrides] = useState({}); // { [itemId]: { title, sub, ..., imageUrl } }

  useEffect(() => {
    const allIds = [...concerts, ...exhibitions].map((i) => i.id);
    loadAllSections(allIds, "meta").then(setOverrides);
  }, [mode]);

  const items = useMemo(() => {
    const base = mode === "music" ? concerts : exhibitions;
    return base.map((item) => ({ ...item, ...overrides[item.id] }));
  }, [mode, overrides]);

  const accent = mode === "music" ? PALETTE.music : PALETTE.art;
  const current = items[active];

  const switchMode = (m) => {
    setMode(m);
    setActive(0);
  };

  const cycle = (dir) => {
    setActive((prev) => (prev + dir + items.length) % items.length);
  };

  return (
    <div
      style={{ background: PALETTE.paper, color: PALETTE.ink, fontFamily: "'Inter', sans-serif" }}
      className="w-full min-h-screen"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .disp { font-family: 'Fraunces', serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.02em; }
        .spin-slow { animation: spin 9s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* top bar */}
      <div className="flex items-start justify-between px-6 pt-8 pb-4 md:px-12">
        <div>
          <div className="mono text-xs" style={{ color: PALETTE.stone }}>HEREDIUM OPS · 실무자 콘솔</div>
          <div className="disp text-2xl md:text-3xl mt-1" style={{ fontWeight: 500 }}>
            {mode === "music" ? "이번 음악회 고르기" : "지난 전시 포스터 서가"}
          </div>
          <div className="text-sm mt-1 max-w-md" style={{ color: "#C9C5BE" }}>
            {mode === "music"
              ? "LP를 넘기듯 진행·예정 음악회를 훑어보고 상세 정보를 확인하세요."
              : "전시 포스터 서가를 넘기며 헤레디움이 열었던 전시를 확인하세요."}
          </div>
        </div>

        {/* mode toggle */}
        <div className="flex flex-col gap-2 mono text-xs">
          <span style={{ color: PALETTE.stone }}>MODE</span>
          <button
            onClick={() => switchMode("music")}
            className="flex items-center gap-2 px-3 py-2"
            style={{
              border: `1px solid ${mode === "music" ? PALETTE.ink : PALETTE.stone}`,
              background: mode === "music" ? PALETTE.ink : "transparent",
              color: mode === "music" ? PALETTE.paper : PALETTE.ink,
            }}
          >
            <Disc3 size={14} /> 음악 MUSIC
          </button>
          <button
            onClick={() => switchMode("art")}
            className="flex items-center gap-2 px-3 py-2"
            style={{
              border: `1px solid ${mode === "art" ? PALETTE.ink : PALETTE.stone}`,
              background: mode === "art" ? PALETTE.ink : "transparent",
              color: mode === "art" ? PALETTE.paper : PALETTE.ink,
            }}
          >
            <Frame size={14} /> 미술 ART
          </button>
        </div>
      </div>

      {/* stage */}
      <div className="flex flex-col md:flex-row gap-8 px-6 md:px-12 pb-16" style={{ perspective: "1600px" }}>
        {/* stack */}
        <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 720 }}>
          {items.map((item, i) => {
            const offset = i - active;
            const abs = Math.abs(offset);
            if (abs > 4) return null;
            const isFront = offset === 0;
            const style = {
              position: "absolute",
              transform: isFront
                ? "translate(0px,0px) rotate(0deg) scale(1)"
                : `translate(${offset * 52}px, ${-abs * 20}px) rotate(${offset * 4}deg) scale(${1 - abs * 0.06})`,
              zIndex: 50 - abs,
              opacity: isFront ? 1 : Math.max(0.25, 1 - abs * 0.22),
              filter: isFront ? "none" : `grayscale(${Math.min(abs * 0.3, 0.8)})`,
              transition: "all 500ms cubic-bezier(.2,.8,.2,1)",
              cursor: "pointer",
            };

            return (
              <div
                key={item.id}
                style={style}
                onClick={() => (isFront ? router.push(`/${mode}/${item.id}`) : setActive(i))}
              >
                {mode === "music" ? (
                  <MusicCard item={item} front={isFront} accent={accent} image={item.imageUrl} />
                ) : (
                  <PosterCard item={item} front={isFront} accent={accent} image={item.imageUrl} />
                )}
              </div>
            );
          })}

          {/* nav arrows */}
          <button
            onClick={() => cycle(-1)}
            className="absolute left-0 md:-left-6 top-1/2 -translate-y-1/2 p-2"
            style={{ color: PALETTE.stone }}
            aria-label="이전"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => cycle(1)}
            className="absolute right-0 md:-right-6 top-1/2 -translate-y-1/2 p-2"
            style={{ color: PALETTE.stone }}
            aria-label="다음"
          >
            <ChevronRight />
          </button>
        </div>

        {/* detail panel */}
        <div className="md:w-72 shrink-0 pt-4 md:pt-24">
          <div className="mono text-xs" style={{ color: PALETTE.stone }}>{current.code}</div>
          <div className="disp text-xl mt-1" style={{ fontWeight: 500 }}>{current.title}</div>
          <div className="text-sm mb-4" style={{ color: "#C9C5BE" }}>{current.sub}</div>

          <div className="flex items-center gap-2 text-sm mb-1">
            <CalendarDays size={14} style={{ color: PALETTE.stone }} /> {current.date}
          </div>
          <div className="flex items-center gap-2 text-sm mb-4">
            <MapPin size={14} style={{ color: PALETTE.stone }} /> {current.venue}
          </div>

          <span
            className="mono text-xs px-2 py-1 inline-block mb-4"
            style={{ background: accent, color: PALETTE.paper }}
          >
            {current.status}
          </span>

          <p className="text-sm leading-relaxed" style={{ color: "#3A3830" }}>{current.blurb}</p>

          <Link
            href={`/${mode}/${current.id}`}
            className="flex items-center gap-1 mono text-xs mt-6"
            style={{ color: accent }}
          >
            자세히 보기 <ArrowRight size={12} />
          </Link>

          <Link
            href={`/${mode}/${current.id}/edit`}
            className="flex items-center gap-1 mono text-xs mt-2"
            style={{ color: PALETTE.stone }}
          >
            <Pencil size={11} /> 카드 내용·이미지 수정
          </Link>

        </div>
      </div>
    </div>
  );
}

function MusicCard({ item, front, accent, image }) {
  return (
    <div className="relative" style={{ width: 480, height: 480 }}>
      {/* record disc peeking out */}
      <div
        className={front ? "spin-slow" : ""}
        style={{
          position: "absolute",
          right: -130,
          top: 36,
          width: 408,
          height: 408,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 50%, #3a3a3a 0 3%, ${PALETTE_VINYL} 4% 100%)`,
          boxShadow: front ? "0 24px 60px rgba(0,0,0,0.55)" : "none",
        }}
      />
      {/* sleeve — image only, no text overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-between p-6"
        style={{
          background: image ? `#1A1A1A url(${image}) center/cover no-repeat` : "#1A1A1A",
          border: `1px solid ${accent}`,
          boxShadow: front
            ? "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 12px 30px rgba(0,0,0,0.4)",
        }}
      >
        <div
          className="mono text-xs px-2 py-1 inline-block w-fit"
          style={{ color: "#fff", background: "rgba(0,0,0,0.6)", letterSpacing: "0.08em" }}
        >
          {item.code}
        </div>
        {!image && (
          <div className="disp text-2xl leading-tight" style={{ fontWeight: 500, color: "#E8E4DC", opacity: 0.35 }}>
            {item.title}
          </div>
        )}
      </div>
    </div>
  );
}
const PALETTE_VINYL = "#141210";

function PosterCard({ item, front, accent, image }) {
  return (
    <div
      className="flex flex-col justify-between p-6"
      style={{
        width: 420,
        height: 600,
        background: image ? `#1A1A1A url(${image}) center/cover no-repeat` : "#1A1A1A",
        border: `1px solid ${accent}`,
        boxShadow: front
          ? "0 36px 90px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)"
          : "0 14px 34px rgba(0,0,0,0.45)",
      }}
    >
      <div
        className="mono text-xs px-2 py-1 inline-block w-fit"
        style={{ color: "#fff", background: "rgba(0,0,0,0.6)", letterSpacing: "0.08em" }}
      >
        {item.code}
      </div>
      {!image && (
        <div className="text-center">
          <div className="disp text-3xl leading-tight" style={{ fontWeight: 600, color: "#E8E4DC", opacity: 0.35 }}>
            {item.title}
          </div>
        </div>
      )}
      <div />
    </div>
  );
}

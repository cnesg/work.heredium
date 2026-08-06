"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, CalendarDays, CheckSquare, Square, ExternalLink, FolderOpen, Pencil, Mic } from "lucide-react";
import { loadSection } from "../lib/supabase";

const PALETTE = {
  paper: "var(--surface)",
  ink: "var(--text)",
  stone: "#C9C5BE",
  art: "#7B9EA8",
  music: "#c35131",
};

export default function DetailPage({ item: baseItem, mode }) {
  const accent = mode === "music" ? PALETTE.music : PALETTE.art;
  const [item, setItem] = useState(baseItem);
  const [checklist, setChecklist] = useState(baseItem.checklist || []);

  useEffect(() => {
    loadSection(baseItem.id, "meta", {}).then((meta) => {
      setItem((prev) => ({ ...prev, ...meta }));
    });
  }, [baseItem.id]);

  const toggle = (idx) => {
    setChecklist((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, done: !c.done } : c))
    );
  };

  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div style={{ background: PALETTE.paper, color: PALETTE.ink, minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-6 md:px-0 py-10">
        <Link
          href={mode === "music" ? "/" : "/"}
          className="flex items-center gap-1 mono text-xs mb-8"
          style={{ color: PALETTE.stone }}
        >
          <ArrowLeft size={12} /> 스택으로 돌아가기
        </Link>

        <div className="mono text-xs" style={{ color: accent }}>{item.code}</div>
        <h1 className="disp text-3xl mt-1" style={{ fontWeight: 600 }}>{item.title}</h1>
        <div className="text-base mt-1" style={{ color: "var(--muted)" }}>{item.sub}</div>

        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt=""
            className="w-full mt-4"
            style={{ maxHeight: 280, objectFit: "cover", border: "1px solid var(--border)" }}
          />
        )}

        <div className="flex flex-wrap gap-4 mt-5 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} style={{ color: PALETTE.stone }} /> {item.date}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} style={{ color: PALETTE.stone }} /> {item.venue}
          </div>
          <span
            className="mono text-xs px-2 py-1"
            style={{ background: accent, color: PALETTE.paper }}
          >
            {item.status}
          </span>
        </div>

        <p className="text-sm leading-relaxed mt-6 max-w-lg" style={{ color: "var(--text)" }}>
          {item.description}
        </p>

        <Link
          href={`/assets/${mode}/${item.id}`}
          className="flex items-center gap-2 mono text-xs mt-4"
          style={{ color: accent }}
        >
          <FolderOpen size={13} /> 자료실 열기 (포스터·서문·보도자료 등)
        </Link>
        <Link
          href={`/sns/${mode}/${item.id}`}
          className="flex items-center gap-2 mono text-xs mt-2"
          style={{ color: accent }}
        >
          <FolderOpen size={13} /> SNS 기획 열기
        </Link>
        <Link
          href={`/${mode}/${item.id}/edit`}
          className="flex items-center gap-2 mono text-xs mt-2"
          style={{ color: PALETTE.stone }}
        >
          <Pencil size={12} /> 카드 내용·이미지 수정
        </Link>
        {mode === "art" && (
          <Link
            href={`/art/${item.id}/docent`}
            className="flex items-center gap-2 mono text-xs mt-2"
            style={{ color: PALETTE.stone }}
          >
            <Mic size={12} /> 도슨트 관리
          </Link>
        )}

        {/* checklist */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <div className="mono text-xs" style={{ color: PALETTE.stone }}>실무 체크리스트</div>
            <div className="mono text-xs" style={{ color: PALETTE.stone }}>
              {doneCount}/{checklist.length}
            </div>
          </div>
          <div style={{ border: `1px solid #E2DCCB` }}>
            {checklist.map((c, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm"
                style={{
                  borderBottom: i < checklist.length - 1 ? "1px solid var(--border)" : "none",
                  color: c.done ? "var(--muted)" : PALETTE.ink,
                  textDecoration: c.done ? "line-through" : "none",
                }}
              >
                {c.done ? (
                  <CheckSquare size={16} style={{ color: accent }} />
                ) : (
                  <Square size={16} style={{ color: PALETTE.stone }} />
                )}
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* links */}
        {item.links && item.links.length > 0 && (
          <div className="mt-10">
            <div className="mono text-xs mb-3" style={{ color: PALETTE.stone }}>관련 링크</div>
            <div className="flex flex-col gap-2">
              {item.links.map((l, i) => (
                <a
                  key={i}
                  href={l.href}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: accent }}
                >
                  <ExternalLink size={13} /> {l.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

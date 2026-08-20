"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, UploadCloud, Wand2, Save, Trash2, Info } from "lucide-react";
import { loadSection, saveSection, supabase } from "../lib/supabase";
import { parseDocentText } from "../lib/docentParser";

const PALETTE = { paper: "var(--surface)", ink: "var(--text)", stone: "#C9C5BE", accent: "#7B9EA8" };

export default function DocentManager({ item }) {
  const [driveLink, setDriveLink] = useState("");
  const [rawText, setRawText] = useState("");
  const [sections, setSections] = useState([]);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef(null);
  const [liveInfo, setLiveInfo] = useState({ title: item.title });

  useEffect(() => {
    loadSection(item.id, "meta", {}).then((meta) => {
      setLiveInfo((prev) => ({ ...prev, ...meta }));
    });
  }, [item.id]);

  
  useEffect(() => {
    loadSection(item.id, "docent", { sections: [], sourceLink: "" }).then((data) => {
      setSections(data.sections || []);
      setDriveLink(data.sourceLink || "");
      setLoaded(true);
    });
  }, [item.id]);

  const importFromLink = async () => {
    if (!driveLink.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import-docent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: driveLink }),
      });
      const data = await res.json();
      if (data.text) setRawText(data.text);
      else alert(data.error || "가져오기 실패");
    } finally {
      setImporting(false);
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawText(String(reader.result || ""));
    reader.readAsText(file, "utf-8");
  };

  const parse = () => {
    setSections(parseDocentText(rawText));
  };

  const updateSectionName = (idx, name) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, name } : s)));
  };

  const removeSection = (idx) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    const r = await saveSection(item.id, "docent", { sections, sourceLink: driveLink });
    setSaving(false);
    setSaveMsg(r?.ok ? "✓ 저장됐어요" : `저장 실패: ${r?.error || "알 수 없는 오류"}`);
  };

  return (
    <div style={{ background: PALETTE.paper, color: PALETTE.ink, minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-6 md:px-0 py-10">
        <Link href={`/art/${item.id}`} className="flex items-center gap-1 mono text-xs mb-8" style={{ color: PALETTE.stone }}>
          <ArrowLeft size={12} /> 전시 상세로
        </Link>

        <div className="mono text-xs" style={{ color: PALETTE.accent }}>{item.code}</div>
        <h1 className="disp text-2xl mt-1 mb-6" style={{ fontWeight: 600 }}>{liveInfo.title} · 도슨트 관리</h1>

        {!supabase && (
          <div className="flex items-start gap-2 text-xs mb-6 p-3" style={{ background: "rgba(139,58,58,0.2)", border: "1px solid rgba(200,100,100,0.4)", color: "#c35131" }}>
            <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>Supabase 연결 전이라 저장이 안 돼요.</span>
          </div>
        )}

        {/* import options */}
        <div className="mono text-xs mb-2" style={{ color: PALETTE.stone }}>구글 문서 링크에서 가져오기</div>
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={16} style={{ color: PALETTE.accent }} />
          <input
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder="https://docs.google.com/document/d/..."
            className="flex-1 text-sm px-3 py-2"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}
          />
          <button
            onClick={importFromLink}
            disabled={importing}
            className="mono text-xs px-3 py-2"
            style={{ background: PALETTE.ink, color: PALETTE.paper }}
          >
            {importing ? "가져오는 중..." : "가져오기"}
          </button>
        </div>
        <div className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          문서가 "링크가 있는 모든 사용자(보기)"로 공유되어 있어야 가져올 수 있어요.
        </div>

        <div className="flex items-center gap-2 mb-6">
          <label
            className="mono text-xs flex items-center gap-2 px-3 py-2 cursor-pointer"
            style={{ border: `1px solid ${PALETTE.accent}`, color: PALETTE.accent }}
          >
            <UploadCloud size={14} /> .txt 파일 업로드
            <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={onFile} />
          </label>
          <span className="text-xs" style={{ color: PALETTE.stone }}>또는 아래에 직접 붙여넣기</span>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={8}
          placeholder="도슨트 스크립트 원문을 여기 붙여넣으세요 (번호 매겨진 작가/작품 목록 형태)"
          className="text-sm w-full px-3 py-2 mb-3"
          style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}
        />
        <button
          onClick={parse}
          disabled={!rawText.trim()}
          className="flex items-center gap-2 mono text-xs px-3 py-2 mb-8"
          style={{ background: PALETTE.ink, color: PALETTE.paper }}
        >
          <Wand2 size={14} /> 작가/작품별로 나누기
        </button>

        {/* section preview */}
        {sections.length > 0 && (
          <>
            <div className="mono text-xs mb-2" style={{ color: PALETTE.stone }}>
              나뉜 섹션 ({sections.length}개) — 이름 수정하거나 불필요한 항목 삭제 가능
            </div>
            <div className="flex flex-col gap-2 mb-6">
              {sections.map((s, idx) => (
                <div key={idx} className="p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      value={s.name}
                      onChange={(e) => updateSectionName(idx, e.target.value)}
                      className="text-sm flex-1 px-2 py-1"
                      style={{ border: "1px solid var(--border)" }}
                    />
                    <button onClick={() => removeSection(idx)} aria-label="삭제">
                      <Trash2 size={14} style={{ color: PALETTE.stone }} />
                    </button>
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {s.text.slice(0, 80)}... ({s.text.length}자)
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 mono text-xs px-4 py-2"
              style={{ background: PALETTE.accent, color: "white" }}
            >
              <Save size={14} /> {saving ? "저장 중..." : "저장 (카드뉴스 생성기에서 바로 쓸 수 있어요)"}
            </button>
            {saveMsg && (
              <div className="mono text-xs mt-3 p-2" style={{
                background: saveMsg.startsWith("✓") ? "rgba(123,158,168,0.12)" : "rgba(139,58,58,0.25)",
                color: saveMsg.startsWith("✓") ? "#7B9EA8" : "#E88080",
              }}>
                {saveMsg}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

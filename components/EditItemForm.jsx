"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Save, Info } from "lucide-react";
import { loadSection, saveSection, supabase } from "../lib/supabase";
import { uploadFile } from "../lib/storage";

const PALETTE = {
  paper: "var(--surface)",
  ink: "var(--text)",
  stone: "#C9C5BE",
  art: "#7B9EA8",
  music: "#c35131",
};

export default function EditItemForm({ item, mode }) {
  const router = useRouter();
  const accent = mode === "music" ? PALETTE.music : PALETTE.art;

  const [form, setForm] = useState({
    title: item.title,
    sub: item.sub,
    date: item.date,
    venue: item.venue,
    status: item.status,
    blurb: item.blurb,
    imageUrl: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const meta = await loadSection(item.id, "meta", {});
      setForm((prev) => ({ ...prev, ...meta }));
      setLoaded(true);
    })();
  }, [item.id]);

  const field = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    const result = await uploadFile(`covers/${item.id}`, file);
    setUploading(false);
    if (result?.url) setForm((prev) => ({ ...prev, imageUrl: result.url }));
    else setUploadError(`업로드 실패: ${result?.error || "알 수 없는 오류"}`);
  };

  const save = async () => {
    setSaving(true);
    const r = await saveSection(item.id, "meta", form);
    setSaving(false);
    if (r?.ok) {
      window.location.href = "/";
    } else {
      setUploadError(`저장 실패: ${r?.error || "알 수 없는 오류"}`);
    }
  };

  return (
    <div style={{ background: PALETTE.paper, color: PALETTE.ink, minHeight: "100vh" }}>
      <div className="max-w-lg mx-auto px-6 md:px-0 py-10">
        <Link
          href={`/${mode}/${item.id}`}
          className="flex items-center gap-1 mono text-xs mb-8"
          style={{ color: PALETTE.stone }}
        >
          <ArrowLeft size={12} /> 취소하고 돌아가기
        </Link>

        <div className="mono text-xs" style={{ color: accent }}>{item.code}</div>
        <h1 className="disp text-2xl mt-1 mb-6" style={{ fontWeight: 600 }}>카드 내용 수정</h1>

        {!supabase && (
          <div className="flex items-start gap-2 text-xs mb-6 p-3" style={{ background: "rgba(139,58,58,0.2)", border: "1px solid rgba(200,100,100,0.4)", color: "#c35131" }}>
            <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>Supabase 연결 전이라 저장이 안 돼요. README를 참고해 환경변수를 설정해주세요.</span>
          </div>
        )}

        {/* cover image */}
        <div className="mb-6">
          <div className="mono text-[11px] mb-2" style={{ color: PALETTE.stone }}>커버 이미지 (스택 카드 배경)</div>
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt=""
              className="w-full mb-2"
              style={{ maxHeight: 220, objectFit: "cover", border: "1px solid var(--border)" }}
            />
          )}
          <label
            className="mono text-xs flex items-center gap-2 px-3 py-2 cursor-pointer inline-flex"
            style={{ border: `1px solid ${accent}`, color: accent }}
          >
            <UploadCloud size={14} /> {uploading ? "업로드 중..." : "이미지 업로드"}
            <input type="file" accept="image/*" className="hidden" onChange={onImage} />
          </label>
          {uploadError && (
            <div className="text-xs mt-2 p-2" style={{ background: "rgba(139,58,58,0.2)", color: "#E88080" }}>
              {uploadError}
            </div>
          )}
        </div>

        <Field label="제목" value={form.title} onChange={field("title")} />
        <Field label="부제" value={form.sub} onChange={field("sub")} />
        <Field label="날짜" value={form.date} onChange={field("date")} />
        <Field label="장소" value={form.venue} onChange={field("venue")} />
        <Field label="상태 (예: 예정 / 예매중 / 종료 / 얼리버드)" value={form.status} onChange={field("status")} />
        <div className="mb-6">
          <div className="mono text-[11px] mb-1" style={{ color: PALETTE.stone }}>설명</div>
          <textarea
            value={form.blurb}
            onChange={field("blurb")}
            rows={4}
            className="text-sm w-full px-3 py-2"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}
          />
        </div>

        <button
          onClick={save}
          disabled={saving || !loaded}
          className="flex items-center gap-2 mono text-xs px-4 py-2"
          style={{ background: PALETTE.ink, color: PALETTE.paper }}
        >
          <Save size={14} /> {saving ? "저장 중..." : "저장하고 돌아가기"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div className="mb-4">
      <div className="mono text-[11px] mb-1" style={{ color: "var(--muted)" }}>{label}</div>
      <input
        value={value}
        onChange={onChange}
        className="text-sm w-full px-3 py-2"
        style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}
      />
    </div>
  );
}

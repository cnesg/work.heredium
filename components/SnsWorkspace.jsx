"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckSquare, Square, Plus, Trash2, Info,
  ExternalLink, UploadCloud, Link2, Save, Pencil,
} from "lucide-react";
import { loadSection, saveSection, supabase } from "../lib/supabase";
import { uploadFile } from "../lib/storage";

const P = {
  paper: "var(--surface2)", ink: "var(--text)", stone: "#C9C5BE",
  accent: "#c35131", border: "var(--border)",
};

const CHANNEL_OPTIONS = ["Instagram", "TikTok", "YouTube Shorts", "네이버 블로그", "기타"];

const detectPlatform = (url) => {
  if (/instagram\.com/.test(url)) return "Instagram";
  if (/tiktok\.com/.test(url)) return "TikTok";
  if (/youtube\.com|youtu\.be/.test(url)) return "YouTube Shorts";
  if (/blog\.naver\.com/.test(url)) return "네이버 블로그";
  return null;
};

const newCampaign = (n) => ({
  id: `c${Date.now()}`,
  name: `${n}차 기획`,
  guides: [],
  channels: { selected: [], powerChannel: "" },
  confirm: { channelConfirmed: false, dateConfirmed: false, publishDate: "" },
  drafts: [],
  published: [],
});

export default function SnsWorkspace({ item, mode }) {
  const accent = P.accent;
  const [campaigns, setCampaigns] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState({ status: "idle", msg: "" });
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState("");

  const [liveInfo, setLiveInfo] = useState({ title: item.title });

  useEffect(() => {
    loadSection(item.id, "meta", {}).then((meta) => {
      setLiveInfo((prev) => ({ ...prev, ...meta }));
    });
  }, [item.id]);

  useEffect(() => {
    (async () => {
      const data = await loadSection(item.id, "sns", {});
      let list = data.campaigns;
      // migrate old single-campaign shape
      if (!list && (data.guide || data.channels || data.drafts)) {
        list = [{
          ...newCampaign(1),
          guides: [
            ...(data.guide?.cardnewsLink ? [{ id: "g1", label: "카드뉴스용 가이드", kind: "link", url: data.guide.cardnewsLink }] : []),
            ...(data.guide?.reelsLink ? [{ id: "g2", label: "릴스용 가이드", kind: "link", url: data.guide.reelsLink }] : []),
          ],
          channels: data.channels || newCampaign(1).channels,
          confirm: data.confirm || newCampaign(1).confirm,
          drafts: data.drafts || [],
          published: data.published || [],
        }];
      }
      if (!list || list.length === 0) list = [newCampaign(1)];
      setCampaigns(list);
      setActiveId(list[0].id);
      setLoaded(true);
    })();
  }, [item.id]);

  useEffect(() => {
    if (!loaded) return;
    setSaveState({ status: "saving", msg: "" });
    saveSection(item.id, "sns", { campaigns }).then((r) =>
      setSaveState(r?.ok ? { status: "saved", msg: "" } : { status: "error", msg: r?.error || "오류" })
    );
  }, [campaigns, loaded]);

  const cur = campaigns.find((c) => c.id === activeId);
  const patch = (p) => setCampaigns((prev) => prev.map((c) => (c.id === activeId ? { ...c, ...p } : c)));

  const addCampaign = () => {
    const c = newCampaign(campaigns.length + 1);
    setCampaigns((prev) => [...prev, c]);
    setActiveId(c.id);
  };

  const removeCampaign = (id) => {
    if (campaigns.length <= 1) return;
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    setActiveId((a) => (a === id ? campaigns.find((c) => c.id !== id).id : a));
  };

  // ── guides ──
  const addGuideLink = () =>
    patch({ guides: [...cur.guides, { id: `g${Date.now()}`, label: "새 가이드", kind: "link", url: "" }] });

  const onGuideFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const r = await uploadFile(`sns/${item.id}/guides`, file);
    setUploading(false);
    if (r?.url) {
      patch({ guides: [...cur.guides, { id: `g${Date.now()}`, label: file.name, kind: "file", url: r.url }] });
    } else {
      setSaveState({ status: "error", msg: `업로드 실패: ${r?.error || "오류"}` });
    }
  };

  const updGuide = (id, p) => patch({ guides: cur.guides.map((g) => (g.id === id ? { ...g, ...p } : g)) });
  const delGuide = (id) => patch({ guides: cur.guides.filter((g) => g.id !== id) });

  // ── drafts / published ──
  const addDraft = () => patch({ drafts: [...cur.drafts, { id: Date.now(), link: "", feedback: "", status: "검토중" }] });
  const updDraft = (id, p) => patch({ drafts: cur.drafts.map((d) => (d.id === id ? { ...d, ...p } : d)) });
  const delDraft = (id) => patch({ drafts: cur.drafts.filter((d) => d.id !== id) });

  const addPub = () => patch({ published: [...cur.published, { id: Date.now(), platform: "Instagram", url: "", postedAt: "" }] });
  const updPub = (id, p) => patch({ published: cur.published.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const delPub = (id) => patch({ published: cur.published.filter((x) => x.id !== id) });

  const manualSave = async () => {
    setSaveState({ status: "saving", msg: "" });
    const r = await saveSection(item.id, "sns", { campaigns });
    setSaveState(r?.ok ? { status: "saved", msg: "" } : { status: "error", msg: r?.error || "오류" });
  };

  if (!cur) return <div style={{ padding: 40, color: P.stone }}>불러오는 중...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: P.ink }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/sns" className="flex items-center gap-1 mono text-xs mb-8" style={{ color: P.stone }}>
          <ArrowLeft size={12} /> 프로젝트 목록으로
        </Link>

        <div className="mono text-xs" style={{ color: accent }}>{item.code}</div>
        <h1 className="disp text-2xl mt-1" style={{ fontWeight: 600 }}>{liveInfo.title} · SNS 기획</h1>

        {!supabase && (
          <div className="flex items-start gap-2 text-xs mt-4 p-3" style={{ background: "rgba(139,58,58,0.2)", border: "1px solid rgba(200,100,100,0.4)", color: "#E88080" }}>
            <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>Supabase 연결 전이라 저장되지 않아요.</span>
          </div>
        )}

        {saveState.status !== "idle" && (
          <div className="mono text-xs mt-3 p-2" style={{
            background: saveState.status === "error" ? "rgba(139,58,58,0.25)" : "rgba(195,81,49,0.12)",
            color: saveState.status === "error" ? "#E88080" : accent,
          }}>
            {saveState.status === "saving" && "저장 중..."}
            {saveState.status === "saved" && "✓ 저장됨"}
            {saveState.status === "error" && `저장 실패: ${saveState.msg}`}
          </div>
        )}

        {/* ── CAMPAIGN TABS ── */}
        <div className="flex items-center gap-2 mt-8 flex-wrap" style={{ borderBottom: `1px solid ${P.border}`, paddingBottom: 10 }}>
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center">
              {renaming === c.id ? (
                <input
                  autoFocus
                  defaultValue={c.name}
                  onBlur={(e) => {
                    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value || x.name } : x)));
                    setRenaming("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                  className="mono text-xs px-2 py-1.5"
                  style={{ width: 110 }}
                />
              ) : (
                <button
                  onClick={() => setActiveId(c.id)}
                  onDoubleClick={() => setRenaming(c.id)}
                  className="mono text-xs px-3 py-1.5 flex items-center gap-1.5"
                  style={{
                    border: `1px solid ${activeId === c.id ? accent : P.border}`,
                    background: activeId === c.id ? "rgba(195,81,49,0.14)" : "transparent",
                    color: activeId === c.id ? accent : P.stone,
                  }}
                >
                  {c.name}
                  {activeId === c.id && <Pencil size={9} onClick={(e) => { e.stopPropagation(); setRenaming(c.id); }} />}
                </button>
              )}
            </div>
          ))}
          <button onClick={addCampaign} className="mono text-xs px-2 py-1.5 flex items-center gap-1"
            style={{ border: `1px dashed ${P.border}`, color: P.stone }}>
            <Plus size={11} /> 기획 추가
          </button>
          {campaigns.length > 1 && (
            <button onClick={() => removeCampaign(activeId)} className="mono text-xs px-2 py-1.5 ml-auto"
              style={{ border: `1px solid ${P.border}`, color: "#E88080" }}>
              <Trash2 size={11} />
            </button>
          )}
        </div>
        <div className="mono text-[10px] mt-2" style={{ color: P.stone }}>
          탭을 더블클릭하면 이름을 바꿀 수 있어요
        </div>

        {/* STEP 1 — guides */}
        <Step n={1} title="홍보 가이드 지침 문서" accent={accent}>
          <div className="flex gap-2 mb-3 flex-wrap">
            <button onClick={addGuideLink} className="mono text-xs px-3 py-2 flex items-center gap-1"
              style={{ border: `1px solid ${accent}`, color: accent }}>
              <Link2 size={12} /> 링크 추가
            </button>
            <label className="mono text-xs px-3 py-2 flex items-center gap-1 cursor-pointer"
              style={{ border: `1px solid ${accent}`, color: accent }}>
              <UploadCloud size={12} /> {uploading ? "업로드 중..." : "파일 업로드"}
              <input type="file" className="hidden" onChange={(e) => { onGuideFile(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </div>

          {cur.guides.length === 0 && (
            <div className="text-xs" style={{ color: P.stone }}>아직 등록된 가이드가 없어요.</div>
          )}

          {cur.guides.map((g) => (
            <div key={g.id} className="p-3 mb-2" style={{ border: `1px solid ${P.border}`, background: P.paper }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="mono text-[10px] px-1.5 py-0.5" style={{ background: accent, color: "#fff" }}>
                  {g.kind === "file" ? "FILE" : "LINK"}
                </span>
                <input value={g.label} onChange={(e) => updGuide(g.id, { label: e.target.value })}
                  className="text-sm flex-1 px-2 py-1" style={{ border: `1px solid ${P.border}` }} />
                <button onClick={() => delGuide(g.id)}><Trash2 size={13} style={{ color: P.stone }} /></button>
              </div>
              {g.kind === "link" ? (
                <input value={g.url} onChange={(e) => updGuide(g.id, { url: e.target.value })}
                  placeholder="https://..." className="text-xs w-full px-2 py-1.5"
                  style={{ border: `1px solid ${P.border}` }} />
              ) : (
                <a href={g.url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1" style={{ color: accent }}>
                  <ExternalLink size={11} /> 파일 열기
                </a>
              )}
            </div>
          ))}
        </Step>

        {/* STEP 2 */}
        <Step n={2} title="배포 SNS 채널 선정" accent={accent}>
          <div className="flex flex-wrap gap-2 mb-3">
            {CHANNEL_OPTIONS.map((ch) => {
              const on = cur.channels.selected.includes(ch);
              return (
                <button key={ch}
                  onClick={() => patch({ channels: { ...cur.channels, selected: on ? cur.channels.selected.filter((c) => c !== ch) : [...cur.channels.selected, ch] } })}
                  className="mono text-xs px-3 py-1.5"
                  style={{ border: `1px solid ${on ? accent : P.border}`, background: on ? accent : "var(--surface2)", color: on ? "#fff" : "#E8E4DC" }}>
                  {ch}
                </button>
              );
            })}
          </div>
          <Label>파워채널명 / 담당자</Label>
          <input value={cur.channels.powerChannel} onChange={(e) => patch({ channels: { ...cur.channels, powerChannel: e.target.value } })}
            className="text-sm w-full px-3 py-2" style={{ border: `1px solid ${P.border}` }} />
        </Step>

        {/* STEP 3 */}
        <Step n={3} title="채널 컨펌 · 날짜 컨펌" accent={accent}>
          <Check label="채널 컨펌 완료" on={cur.confirm.channelConfirmed} accent={accent}
            onClick={() => patch({ confirm: { ...cur.confirm, channelConfirmed: !cur.confirm.channelConfirmed } })} />
          <Check label="배포 날짜 컨펌 완료" on={cur.confirm.dateConfirmed} accent={accent}
            onClick={() => patch({ confirm: { ...cur.confirm, dateConfirmed: !cur.confirm.dateConfirmed } })} />
          <Label>배포 예정일</Label>
          <input type="date" value={cur.confirm.publishDate}
            onChange={(e) => patch({ confirm: { ...cur.confirm, publishDate: e.target.value } })}
            className="text-sm px-3 py-2" style={{ border: `1px solid ${P.border}` }} />
        </Step>

        {/* STEP 4 */}
        <Step n={4} title="파워채널 기획안 · 피드백" accent={accent}>
          {cur.drafts.map((d) => (
            <div key={d.id} className="p-3 mb-2" style={{ border: `1px solid ${P.border}`, background: P.paper }}>
              <div className="flex items-center justify-between mb-2">
                <select value={d.status} onChange={(e) => updDraft(d.id, { status: e.target.value })}
                  className="mono text-xs px-2 py-1" style={{ border: `1px solid ${accent}`, color: accent, background: "var(--surface2)" }}>
                  <option>검토중</option><option>수정요청</option><option>승인</option>
                </select>
                <button onClick={() => delDraft(d.id)}><Trash2 size={13} style={{ color: P.stone }} /></button>
              </div>
              <input value={d.link} onChange={(e) => updDraft(d.id, { link: e.target.value })} placeholder="기획안 링크"
                className="text-sm w-full px-3 py-2" style={{ border: `1px solid ${P.border}` }} />
              <textarea value={d.feedback} onChange={(e) => updDraft(d.id, { feedback: e.target.value })}
                placeholder="피드백 / 수정사항" rows={2} className="text-sm w-full px-3 py-2 mt-2"
                style={{ border: `1px solid ${P.border}` }} />
            </div>
          ))}
          <button onClick={addDraft} className="flex items-center gap-1 mono text-xs px-3 py-2"
            style={{ border: `1px solid ${accent}`, color: accent }}>
            <Plus size={12} /> 기획안 라운드 추가
          </button>
        </Step>

        {/* STEP 5 */}
        <Step n={5} title="배포 완료 · 링크 아카이빙" accent={accent}>
          {cur.published.map((p) => (
            <div key={p.id} className="flex items-center gap-2 mb-2 flex-wrap">
              <select value={p.platform} onChange={(e) => updPub(p.id, { platform: e.target.value })}
                className="mono text-xs px-2 py-2" style={{ border: `1px solid ${P.border}` }}>
                {CHANNEL_OPTIONS.map((ch) => <option key={ch}>{ch}</option>)}
              </select>
              <input type="date" value={p.postedAt || ""} onChange={(e) => updPub(p.id, { postedAt: e.target.value })}
                className="text-xs px-2 py-2" style={{ border: `1px solid ${P.border}` }} />
              <input value={p.url} onChange={(e) => {
                  const url = e.target.value;
                  const detected = detectPlatform(url);
                  updPub(p.id, detected ? { url, platform: detected } : { url });
                }} placeholder="게시물 URL 붙여넣으면 플랫폼 자동 인식"
                className="text-sm flex-1 px-3 py-2" style={{ border: `1px solid ${P.border}`, minWidth: 180 }} />
              {p.url && <a href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={14} style={{ color: accent }} /></a>}
              <button onClick={() => delPub(p.id)}><Trash2 size={13} style={{ color: P.stone }} /></button>
            </div>
          ))}
          <button onClick={addPub} className="flex items-center gap-1 mono text-xs px-3 py-2"
            style={{ border: `1px solid ${accent}`, color: accent }}>
            <Plus size={12} /> 배포 링크 추가
          </button>
          <div className="mono text-[10px] mt-3" style={{ color: P.stone }}>
            여기 등록한 링크는 <Link href="/tracking" style={{ color: accent }}>홍보 결과</Link> 탭에서 성과를 기록할 수 있어요.
          </div>
        </Step>

        <button onClick={manualSave} className="mono text-xs px-5 py-3 mt-10 w-full"
          style={{ background: accent, color: "#fff", border: "none", cursor: "pointer" }}>
          <Save size={13} className="inline mr-1" /> 저장하기
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, accent, children }) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="mono text-xs w-5 h-5 flex items-center justify-center" style={{ background: accent, color: "#fff" }}>{n}</span>
        <span className="text-sm" style={{ fontWeight: 600 }}>{title}</span>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  );
}
function Label({ children }) {
  return <div className="mono text-[11px] mb-1 mt-3" style={{ color: "#C9C5BE" }}>{children}</div>;
}
function Check({ label, on, onClick, accent }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-sm mb-2" style={{ color: on ? "#C9C5BE" : "var(--text)" }}>
      {on ? <CheckSquare size={16} style={{ color: accent }} /> : <Square size={16} style={{ color: "#C9C5BE" }} />}
      {label}
    </button>
  );
}

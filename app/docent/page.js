import Link from "next/link";
import { exhibitions } from "../../lib/data";
import { Mic, ArrowRight } from "lucide-react";

export default function DocentIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 40px" }}>
      <div className="mono" style={{ fontSize: 10, color: "#c35131", letterSpacing: "0.1em" }}>DOCENT</div>
      <h1 className="disp" style={{ fontSize: 28, fontWeight: 500, color: "var(--text)", marginTop: 4, marginBottom: 6 }}>
        도슨트 관리
      </h1>
      <p style={{ fontSize: 12, color: "#C9C5BE", marginBottom: 26, lineHeight: 1.7, maxWidth: 560 }}>
        전시별 도슨트 스크립트를 등록해두면, 카드뉴스 제작에서 작가만 고르면 바로 카드가 생성됩니다.
        구글 문서 링크 · .txt 파일 업로드 · 직접 붙여넣기 모두 가능해요.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 620 }}>
        {exhibitions.map((ex) => (
          <Link key={ex.id} href={`/art/${ex.id}/docent`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 18px", background: "var(--surface2)", border: "1px solid var(--border)",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Mic size={15} style={{ color: "#c35131" }} />
              <div>
                <div className="mono" style={{ fontSize: 10, color: "#c35131" }}>{ex.code}</div>
                <div style={{ fontSize: 14, color: "var(--text)", marginTop: 2 }}>{ex.title}</div>
                <div style={{ fontSize: 11, color: "#C9C5BE", marginTop: 1 }}>{ex.sub}</div>
              </div>
            </div>
            <ArrowRight size={15} style={{ color: "#C9C5BE" }} />
          </Link>
        ))}
      </div>
    </div>
  );
}

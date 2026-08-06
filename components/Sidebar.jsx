"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, FolderOpen, Share2, Sparkles,
  Newspaper, TrendingUp, Users, Settings, BarChart3, Mic,
} from "lucide-react";

const NAV = [
  { label: "HOME", href: "/", icon: LayoutDashboard },
  { label: "자료공유", href: "/assets", icon: FolderOpen },
  { label: "SNS 기획", href: "/sns", icon: Share2 },
  { label: "도슨트 관리", href: "/docent", icon: Mic },
  { label: "콘텐츠 제작", href: "/content", icon: Sparkles },
  { label: "뉴스 대시보드", href: "/news", icon: Newspaper },
  { label: "홍보 결과", href: "/tracking", icon: BarChart3 },
  { label: "트렌드", href: "/trends", icon: TrendingUp },
  { label: "관람객 분석", href: "/visitors", icon: Users },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside style={{
      width: 200,
      minWidth: 200,
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      overflow: "auto",
    }}>
      {/* logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div className="disp" style={{ fontSize: 15, fontWeight: 500, color: "var(--accent)", letterSpacing: "0.05em" }}>
          HEREDIUM
        </div>
        <div className="mono" style={{ fontSize: 9, color: "var(--muted)", marginTop: 3, letterSpacing: "0.1em" }}>
          WORK CONSOLE
        </div>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 20px",
                fontSize: 12,
                fontWeight: active ? 500 : 400,
                color: active ? "var(--accent)" : "#D8D4CD",
                background: active ? "rgba(195,81,49,0.12)" : "transparent",
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>HEREDIUM · 실무자 콘솔</div>
      </div>
    </aside>
  );
}

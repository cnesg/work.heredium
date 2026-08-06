import "./globals.css";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "HEREDIUM OPS",
  description: "헤레디움 실무자 콘솔",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

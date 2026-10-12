import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HI OFFICE · 나의 데이터 오피스",
  description: "일정, 포트폴리오, 뉴스와 투자 분석을 연결하는 3D 개인 오피스.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}

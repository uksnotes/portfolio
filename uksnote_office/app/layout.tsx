import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrainCrews · 나에게 맞춘 AI 오피스",
  description: "AI 팀이 조사와 비교를 맡고, 여행·주식·집 알아보기까지 나에게 맞춰 정리해 주는 맞춤형 오피스.",
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

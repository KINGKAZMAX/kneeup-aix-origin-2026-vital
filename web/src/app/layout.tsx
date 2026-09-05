import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Disclaimer from "@/components/Disclaimer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Kneeup 膝望 · AI 康复训练伙伴",
  description: "Soft Healthcare 演示：患者端训练陪伴 × 医生端 AI 摘要 × 设备模拟器。全部合成数据。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#0B1D33] text-slate-100 antialiased`}
      >
        {children}
        <Disclaimer />
        <footer className="border-t border-white/10 py-3 text-center text-[11px] text-slate-500">
          本演示全部使用合成数据，无真实患者数据 · Kneeup 膝望 @ AIx Origin Summit 2026 HK · Vital
          · All data is synthetic
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title: 'Talent Reels · 看见作品背后的人', description: '以作品证据为中心的 HR 候选人发现演示。所有资料均为虚构。'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="zh-CN"><body>{children}</body></html>; }

import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'PAPA · 拍拍蜜桃',
  icons: { icon: '/favicon.svg' },
  description: '点击拍一拍，按住揉一揉。一个软乎乎、有弹性的蜜桃解压小游戏。',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

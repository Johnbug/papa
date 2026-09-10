import type { Metadata } from 'next';
import './globals.css';
import { zh } from '@/lib/locales/zh';
export const metadata: Metadata = {
  title: zh.title,
  icons: { icon: '/favicon.svg' },
  description: zh.description,
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

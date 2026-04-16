import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MiniBot Cloud - Hosting Bot Mạnh Mẽ & Tối Ưu',
  description: 'Triển khai bot Discord, Telegram, Backend API chỉ với vài click. Đảm bảo uptime 99.9% với mức giá cực kỳ tối ưu.',
  keywords: ['bot hosting', 'discord bot', 'telegram bot', 'minibot', 'cloud hosting'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kafka 실시간 데모",
  description: "Kafka Producer / Topic / Consumer Group 시각화",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

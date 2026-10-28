import type { Metadata } from "next";
import "./globals.css";
import I18nProvider from "@/components/I18nProvider";

export const metadata: Metadata = {
  title: "Kafka Visualizer",
  description:
    "Visualize Kafka cluster: topics, partitions, replication, and live produce/consume.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}

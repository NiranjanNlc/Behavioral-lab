import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import { WebMCPProvider } from "@/webmcp/WebMCPProvider";
import "./globals.css";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });
const body = Source_Serif_4({ variable: "--font-body", subsets: ["latin"] });
const mono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "BehaviorLab — stress-test behavioral nudges",
  description:
    "Simulate which behavioral interventions are most likely to work for a policy goal, and have a skeptical reviewer challenge the evidence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <WebMCPProvider />
      </body>
    </html>
  );
}

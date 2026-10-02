import { Noto_Sans_KR, Nunito } from "next/font/google";
import Icons from "@/components/Icons";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["800", "900"],
});

export const metadata = {
  title: "cooklab",
  description: "영상은 레시피로, 레시피는 요리로.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${notoSansKR.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <Icons />
        <div className="mx-auto w-full max-w-[480px] min-h-screen relative flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "TrailFinder", template: "%s · TrailFinder" },
  description: "Find and log hikes in the LA area.",
};

const themeScript = `(function(){
  try {
    var s=localStorage.getItem('theme')||'auto';
    var d=document.documentElement;
    if(s==='dark'){d.setAttribute('data-theme','dark');return;}
    if(s==='light'){return;}
    if(s==='system'){
      if(window.matchMedia('(prefers-color-scheme: dark)').matches)
        d.setAttribute('data-theme','dark');
      return;
    }
    var h=new Date().getHours();
    if(h<6||h>=18)d.setAttribute('data-theme','dark');
  }catch(e){}
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg text-text font-sans flex flex-col">{children}</body>
    </html>
  );
}

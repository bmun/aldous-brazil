import type { Metadata } from "next";
import { Bebas_Neue, Roboto } from 'next/font/google';
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
});

const roboto = Roboto({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-roboto',
});


export const metadata: Metadata = {
  title: "Aldous - BMUN",
  description: "Registration for Berkeley Model United Nations Conference",
};

export default  function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="aldous" className="min-h-screen bg-base-200">
      <body
        className={`${bebasNeue.variable} ${roboto.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

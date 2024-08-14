"use client"
import "./globals.css";
import { Public_Sans } from "next/font/google";
import "@near-wallet-selector/modal-ui/styles.css";
import { Navbar } from "@/components/Navbar";
import { WalletSelectorContextProvider } from "@/app/contexts/WalletSelectorContext"

const publicSans = Public_Sans({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (

    <html lang="en">
      <head>
        <title>Funding AI</title>
        <link rel="shortcut icon" href="/images/favicon.ico" />
        <meta
          name="description"
          content="PotLock is the portal for public goods, non-profits, and communities to raise funds transparently through our global donor network"
        />
        <meta property="og:title" content="Funding AI" />
        <meta
          property="og:description"
          content="PotLock is the portal for public goods, non-profits, and communities to raise funds transparently through our global donor network"
        />
        <meta property="og:image" content="/images/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Funding AI" />
        <meta
          name="twitter:description"
          content="PotLock is the portal for public goods, non-profits, and communities to raise funds transparently through our global donor network"
        />
        <meta name="twitter:image" content="/images/og-image.png" />
      </head>
      <body className={publicSans.className}>
        <div className="flex flex-col p-4 md:p-12 h-[100vh]">
          <WalletSelectorContextProvider>
            <Navbar></Navbar>
            {children}
          </WalletSelectorContextProvider>
        </div>
      </body>
    </html>

  );
}

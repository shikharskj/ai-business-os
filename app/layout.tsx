import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@/lib/clerk/shadcn-theme";
import {
  getClerkProviderUrls,
  getClerkPublishableKey,
} from "@/lib/clerk/public-env";
import { ThemeProvider } from "@/components/shell/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Business OS",
  description: "Business operations for small Indian businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey = getClerkPublishableKey();
  const clerkUrls = getClerkProviderUrls();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ClerkProvider
            publishableKey={publishableKey}
            signInUrl={clerkUrls.signInUrl}
            signUpUrl={clerkUrls.signUpUrl}
            signInFallbackRedirectUrl={clerkUrls.signInFallbackRedirectUrl}
            signUpFallbackRedirectUrl={clerkUrls.signUpFallbackRedirectUrl}
            appearance={{ theme: shadcn }}
          >
            {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

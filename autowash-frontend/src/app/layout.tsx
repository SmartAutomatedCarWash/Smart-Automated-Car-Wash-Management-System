import type { Metadata } from "next";
import { QueryProvider } from "@/shared/ui/providers/query-provider";
import { ThemeProvider } from "@/shared/ui/providers/theme-provider";
import { Toaster } from "@/shared/ui/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoWash Pro",
  description: "Smart car wash booking and operations platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

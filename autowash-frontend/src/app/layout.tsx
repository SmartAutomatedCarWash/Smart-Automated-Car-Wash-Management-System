import type { Metadata } from "next";
import { QueryProvider } from "@/shared/ui/providers/query-provider";
import { ThemeProvider } from "@/shared/ui/providers/theme-provider";
import { Toaster } from "@/shared/ui/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoWash Pro",
  description: "Nền tảng đặt lịch và vận hành rửa xe thông minh"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
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

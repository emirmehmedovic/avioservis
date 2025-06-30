import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Dynamic import for AuthProvider to disable SSR
const AuthProvider = dynamic(
  () => import("@/contexts/AuthContext").then((mod) => ({ default: mod.AuthProvider })),
  { 
    ssr: false,
    loading: () => <div style={{ display: 'none' }}>Loading...</div>
  }
);

export const metadata: Metadata = {
  title: "AvioServis - Upravljanje Voznim Parkom",
  description: "Aplikacija za upravljanje voznim parkom, servisima i inspekcijama",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bs" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider defaultTheme="light" storageKey="avioservis-theme">
          <AuthProvider>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  border: '1px solid hsl(var(--border))',
                  fontSize: '0.875rem',
                },
                success: {
                  iconTheme: {
                    primary: 'hsl(142.1 76.2% 36.3%)',
                    secondary: 'white',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'hsl(var(--destructive))',
                    secondary: 'white',
                  },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

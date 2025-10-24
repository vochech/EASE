import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import SidebarNav from "./_components/SidebarNav";

export const metadata: Metadata = {
  title: "EASE",
  description: "Work with Ease.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen antialiased">
        <div className="grid grid-cols-[80px_1fr] grid-rows-[64px_1fr] min-h-screen">
          {/* ==== Topbar ==== */}
          <header className="col-span-2 row-start-1 row-end-2 border-b border-[--border] bg-[--bg]">
            <div className="h-16 flex items-center justify-between px-4">
              <div className="text-sm tracking-[0.2em] font-medium">EASE</div>

              <div className="flex-1 max-w-xl mx-4">
                <div className="h-9 rounded-full border border-[--border] flex items-center px-3 text-sm text-neutral-500">
                  ⌘K&nbsp; Search / Jump
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/focus" className="ease-outline-btn">Focus</Link>
                <div className="w-8 h-8 rounded-full bg-[--bg-soft] border border-[--border]" />
              </div>
            </div>
          </header>

          {/* ==== Sidebar ==== */}
          <aside className="row-start-2 row-end-3 border-r border-[--border] bg-[--bg]">
            <SidebarNav />
          </aside>

          {/* ==== Main content ==== */}
          <main className="row-start-2 row-end-3 col-start-2 col-end-3 bg-[--bg]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

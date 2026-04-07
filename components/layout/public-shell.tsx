import type { ReactNode } from "react";
import { MobileBookBar } from "@/components/layout/mobile-book-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function PublicShell({
  children,
  compactHeader = false,
}: {
  children: ReactNode;
  compactHeader?: boolean;
}) {
  return (
    <>
      <SiteHeader compact={compactHeader} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <MobileBookBar />
    </>
  );
}

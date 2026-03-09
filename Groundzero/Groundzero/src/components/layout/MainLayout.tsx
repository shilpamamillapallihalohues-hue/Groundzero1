import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { MobileSidebar } from './MobileSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { Header } from './Header';
import { DesktopTopMenu } from './DesktopTopMenu';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showMobileNav = isMobile || isTablet;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile/Tablet Sidebar - Sheet-based drawer */}
      {showMobileNav && (
        <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      )}

      {/* Header */}
      <Header onMenuClick={() => setSidebarOpen(true)} />

      {/* Desktop Menu Bar - Below Header, GitHub style */}
      {!showMobileNav && (
        <div className="sticky top-14 z-40 bg-background px-4">
          <DesktopTopMenu />
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className={cn("p-3 md:p-4 lg:p-5", showMobileNav && "pb-20")}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {showMobileNav && <MobileBottomNav />}
    </div>
  );
}

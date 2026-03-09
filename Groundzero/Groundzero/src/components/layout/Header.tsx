import { Bell, User, Menu, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChatButton } from '@/components/chat/ChatButton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useProductionRole } from '@/hooks/useProductionRole';
import { ROLE_LABELS } from '@/types/roles';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const showMobileMenu = isMobile || isTablet;
  const { profile, signOut } = useAuth();
  const { role } = useProductionRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Mobile Menu Toggle + Logo */}
        <div className="flex items-center gap-3">
          {showMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="shrink-0 h-8 w-8 rounded-md hover:bg-muted"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          {/* Logo - GitHub style with orange accent */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">GZ</span>
            </div>
            <span className="font-semibold text-foreground text-sm">Ground Zero</span>
          </Link>
        </div>

        {/* Right: Theme Toggle, Chat, Notifications, Profile */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Chat Button */}
          <ChatButton />
          
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-8 w-8 rounded-md hover:bg-muted"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-8 gap-1.5 px-2 rounded-md hover:bg-muted"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                  <span className="text-[10px] font-medium text-primary">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[100px] truncate">
                  {profile?.full_name || 'User'}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-lg border shadow-lg">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[role] || 'Team Member'}</p>
              </div>
              <DropdownMenuItem asChild className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                <Link to="/profile">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

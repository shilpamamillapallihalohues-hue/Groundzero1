import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatSidePanel } from './ChatSidePanel';
import { useChat } from '@/hooks/useChat';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { totalUnread } = useChat();
  const isMobile = useIsMobile();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative",
          isMobile ? "h-9 w-9" : "h-10 w-10"
        )}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className={cn(
          "text-muted-foreground",
          isMobile ? "w-4 h-4" : "w-5 h-5"
        )} />
        {totalUnread > 0 && (
          <span
            className={cn(
              'absolute bg-primary text-primary-foreground font-medium rounded-full flex items-center justify-center px-1',
              isMobile 
                ? '-top-0.5 -right-0.5 min-w-[16px] h-[16px] text-[9px]'
                : '-top-0.5 -right-0.5 min-w-[18px] h-[18px] text-[10px]',
              totalUnread > 99 && 'text-[8px]'
            )}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </Button>

      <ChatSidePanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

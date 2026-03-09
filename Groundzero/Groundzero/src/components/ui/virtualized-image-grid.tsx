import { useRef, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualizedImageGridProps<T> {
  items: T[];
  columns?: number;
  rowHeight?: number;
  gap?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
}

function VirtualizedImageGridInner<T>({
  items,
  columns = 4,
  rowHeight = 260,
  gap = 16,
  className,
  renderItem,
  getItemKey,
}: VirtualizedImageGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + gap,
    overscan: 3,
  });

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto w-full', className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid w-full h-full"
                style={{
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                  padding: `0 0 ${gap}px 0`,
                }}
              >
                {rowItems.map((item, colIdx) => {
                  const globalIdx = virtualRow.index * columns + colIdx;
                  return (
                    <div key={getItemKey ? getItemKey(item, globalIdx) : globalIdx}>
                      {renderItem(item, globalIdx)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const VirtualizedImageGrid = memo(VirtualizedImageGridInner) as typeof VirtualizedImageGridInner;

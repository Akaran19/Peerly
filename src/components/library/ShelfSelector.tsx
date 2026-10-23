import { Shelf } from '@/types';
import { Button } from '@/components/ui/button';
import { BookOpen, Eye, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShelfSelectorProps {
  currentShelf?: Shelf;
  onShelfChange: (shelf: Shelf) => void;
  size?: 'sm' | 'md';
}

const shelfConfig = {
  WANT: {
    label: 'Want to Read',
    shortLabel: 'Want',
    icon: Eye,
    colorClass: 'border-foreground/15 bg-transparent text-foreground hover:border-foreground/50',
    selectedColorClass: 'border-foreground bg-foreground text-background hover:bg-foreground/90'
  },
  READING: {
    label: 'Currently Reading', 
    shortLabel: 'Reading',
    icon: BookOpen,
    colorClass: 'border-foreground/15 bg-transparent text-foreground hover:border-foreground/50',
    selectedColorClass: 'border-foreground bg-foreground text-background hover:bg-foreground/90'
  },
  READ: {
    label: 'Read',
    shortLabel: 'Read', 
    icon: CheckCircle2,
    colorClass: 'border-foreground/15 bg-transparent text-foreground hover:border-foreground/50',
    selectedColorClass: 'border-foreground bg-foreground text-background hover:bg-foreground/90'
  }
} as const;

export function ShelfSelector({ currentShelf, onShelfChange, size = 'md' }: ShelfSelectorProps) {
  const isSmall = size === 'sm';

  return (
    <div className="flex flex-col gap-2 w-full">
      {(Object.keys(shelfConfig) as Shelf[]).map((shelf) => {
        const config = shelfConfig[shelf];
        const Icon = config.icon;
        const isSelected = currentShelf === shelf;
        
        return (
          <Button
            key={shelf}
            variant="outline"
            size={isSmall ? "sm" : "default"}
            onClick={() => onShelfChange(shelf)}
            className={cn(
              "w-full gap-2 transition-all duration-200 justify-start",
              isSelected ? config.selectedColorClass : config.colorClass,
              isSelected && "ring-2 ring-offset-1 shadow-sm",
              isSmall ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
            )}
          >
            <Icon className={cn("flex-shrink-0", isSmall ? "w-3 h-3" : "w-4 h-4")} />
            <span className="truncate">
              {isSmall ? config.shortLabel : config.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
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
    colorClass: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
    selectedColorClass: 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-400 dark:bg-blue-500 dark:text-white'
  },
  READING: {
    label: 'Currently Reading', 
    shortLabel: 'Reading',
    icon: BookOpen,
    colorClass: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
    selectedColorClass: 'border-green-500 bg-green-600 text-white hover:bg-green-700 dark:border-green-400 dark:bg-green-500 dark:text-white'
  },
  READ: {
    label: 'Read',
    shortLabel: 'Read', 
    icon: CheckCircle2,
    colorClass: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
    selectedColorClass: 'border-purple-500 bg-purple-600 text-white hover:bg-purple-700 dark:border-purple-400 dark:bg-purple-500 dark:text-white'
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
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { isPro, type Tier } from '@/lib/tier';

interface UpgradeGuardProps {
  tier?: Tier;
  feature: string;
  children: React.ReactNode;
}

export function UpgradeGuard({ tier, feature, children }: UpgradeGuardProps) {
  if (isPro(tier)) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Pro feature — Upgrade to unlock {feature}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProBadge() {
  return (
    <Badge variant="secondary" className="ml-2 text-xs">
      Pro
    </Badge>
  );
}

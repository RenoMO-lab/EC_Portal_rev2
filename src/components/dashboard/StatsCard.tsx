import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
  iconBg?: string;
}

export default function StatsCard({ title, value, change, changeType = 'neutral', icon, iconBg }: StatsCardProps) {
  return (
    <Card className="border shadow-soft hover:shadow-medium transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-display font-bold">{value}</p>
            {change && (
              <p
                className={cn(
                  'text-xs font-medium',
                  changeType === 'positive' && 'text-success',
                  changeType === 'negative' && 'text-destructive',
                  changeType === 'neutral' && 'text-muted-foreground'
                )}
              >
                {change}
              </p>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl', iconBg || 'bg-primary/10')}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GoogleTrendsChartProps {
  trendHistory: { date: string; value: number }[];
  trend: 'up' | 'down' | 'stable';
  score: number;
  searchVolume?: number;
  relatedQueries: string[];
  isRealData: boolean;
}

export function GoogleTrendsChart({
  trendHistory,
  trend,
  score,
  searchVolume,
  relatedQueries,
  isRealData,
}: GoogleTrendsChartProps) {
  const trendConfig = {
    up: { color: '#22c55e', bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-600 dark:text-green-400', label: 'Growing', Icon: TrendingUp },
    down: { color: '#ef4444', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400', label: 'Declining', Icon: TrendingDown },
    stable: { color: '#eab308', bg: 'bg-yellow-50 dark:bg-yellow-950/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'Stable', Icon: Minus },
  };

  const config = trendConfig[trend] || trendConfig.stable;
  const { Icon } = config;

  // Format chart data — shorten date labels
  const chartData = trendHistory.map(item => ({
    ...item,
    label: item.date?.split(' ')[0] || item.date || '',
  }));

  return (
    <div className="space-y-3">
      {/* Header row: trend badge + score + data source */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg}`}>
            <Icon className={`w-3.5 h-3.5 ${config.text}`} />
            <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            Interest: <span className="font-semibold text-foreground">{score}/100</span>
          </span>
          {searchVolume != null && searchVolume > 0 && (
            <span className="text-xs text-muted-foreground">
              (~{searchVolume.toLocaleString()} monthly searches)
            </span>
          )}
        </div>
        <Badge variant={isRealData ? 'default' : 'secondary'} className="text-[10px]">
          {isRealData ? 'Google Trends API' : 'AI Estimated'}
        </Badge>
      </div>

      {/* Chart */}
      {chartData.length > 2 ? (
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 600 }}
                formatter={(value: number) => [`${value}/100`, 'Interest']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={2}
                fill="url(#trendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={`text-center py-6 rounded-lg ${config.bg}`}>
          <Icon className={`w-8 h-8 mx-auto mb-2 ${config.text}`} />
          <p className={`text-lg font-bold ${config.text}`}>{score}/100</p>
          <p className="text-xs text-muted-foreground">Search interest ({config.label.toLowerCase()})</p>
        </div>
      )}

      {/* Related queries */}
      {relatedQueries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Related:</span>
          {relatedQueries.map((q, i) => (
            <Badge key={i} variant="outline" className="text-[10px] font-normal">
              {q}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

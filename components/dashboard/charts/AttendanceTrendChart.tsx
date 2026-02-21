'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import type { WeeklyAttendancePoint } from '@/types/dashboard'

interface Props {
  data: WeeklyAttendancePoint[]
  locale: string
}

export function AttendanceTrendChart({ data, locale }: Props) {
  const t = useTranslations('dashboard')
  const isAr = locale === 'ar'

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('chartAttendanceTrend')}</CardTitle>
          <CardDescription>{t('chartAttendanceTrendDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            {t('noData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('chartAttendanceTrend')}</CardTitle>
        <CardDescription>{t('chartAttendanceTrendDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={isAr ? [...data].reverse() : data}>
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number | undefined) => [`${value ?? 0}%`, t('chartAttendanceTrend')]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                fill="url(#attendanceGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

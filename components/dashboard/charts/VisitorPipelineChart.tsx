'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { VisitorPipelineItem } from '@/types/dashboard'

const statusColors: Record<string, string> = {
  new: '#3b82f6',       // blue
  assigned: '#f59e0b',  // amber
  contacted: '#0ea5e9', // sky
  converted: '#10b981', // emerald
}

interface Props {
  data: VisitorPipelineItem[]
  locale: string
}

export function VisitorPipelineChart({ data, locale }: Props) {
  const t = useTranslations('dashboard')

  const total = data.reduce((sum, d) => sum + d.count, 0)

  const chartData = data.map(d => ({
    name: t(`pipeline_${d.status}`),
    count: d.count,
    status: d.status,
  }))

  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('chartVisitorPipeline')}</CardTitle>
          <CardDescription>{t('chartVisitorPipelineDesc')}</CardDescription>
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
        <CardTitle className="text-base">{t('chartVisitorPipeline')}</CardTitle>
        <CardDescription>{t('chartVisitorPipelineDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11 }}
                width={80}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={statusColors[entry.status] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

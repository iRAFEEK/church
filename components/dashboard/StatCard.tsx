'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; label: string }
  alert?: { count: number; label: string }
  href?: string
}

export function StatCard({ title, value, icon: Icon, trend, alert }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && trend.value !== 0 && (
            <span className={`flex items-center text-xs ${trend.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value > 0 ? (
                <TrendingUp className="h-3 w-3 me-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 me-0.5" />
              )}
              {trend.label}
            </span>
          )}
          {alert && alert.count > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              {alert.label}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

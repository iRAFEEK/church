'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus,
  Users,
  Calendar,
  Music,
  Megaphone,
  BarChart3,
  Check,
  QrCode,
  Bell,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'
import { SectionHeading } from './shared/SectionHeading'
import { AnimatedSection } from './shared/AnimatedSection'
import { cn } from '@/lib/utils'

interface Feature {
  id: string
  icon: LucideIcon
  color: string
}

const features: Feature[] = [
  { id: 'visitors', icon: UserPlus, color: 'text-green-500 bg-green-500/10' },
  { id: 'groups', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  { id: 'events', icon: Calendar, color: 'text-purple-500 bg-purple-500/10' },
  { id: 'worship', icon: Music, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'communication', icon: Megaphone, color: 'text-rose-500 bg-rose-500/10' },
  { id: 'dashboards', icon: BarChart3, color: 'text-cyan-500 bg-cyan-500/10' },
]

function FeatureMockup({ featureId }: { featureId: string }) {
  const mockups: Record<string, React.ReactNode> = {
    visitors: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="h-5 w-5 text-muted-foreground" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
        {['Sarah M.', 'Ahmad K.', 'Miriam L.'].map((name, i) => (
          <div key={name} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 text-xs font-bold">
              {name[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{i === 0 ? 'New today' : i === 1 ? '2 days ago' : '5 days ago'}</p>
            </div>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              i === 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
            )}>
              {i === 0 ? 'Pending' : 'Contacted'}
            </span>
          </div>
        ))}
      </div>
    ),
    groups: (
      <div className="space-y-3">
        {['Youth Group', 'Prayer Warriors', 'Worship Team'].map((name, i) => (
          <div key={name} className="p-3 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{name}</p>
              <span className="text-xs text-muted-foreground">{[12, 8, 6][i]} members</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${[85, 92, 78][i]}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{[85, 92, 78][i]}%</span>
            </div>
          </div>
        ))}
      </div>
    ),
    events: (
      <div className="space-y-3">
        {['Friday Service', 'Youth Retreat', 'Prayer Night'].map((name, i) => (
          <div key={name} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
            <div className={cn(
              'h-10 w-10 rounded-lg flex flex-col items-center justify-center text-xs',
              'bg-purple-500/10 text-purple-600'
            )}>
              <span className="font-bold">{[14, 21, 16][i]}</span>
              <span className="text-[10px]">Mar</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{[120, 45, 80][i]} registered</p>
            </div>
          </div>
        ))}
      </div>
    ),
    worship: (
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-border/50 bg-card text-center">
          <Music className="h-6 w-6 mx-auto text-amber-500 mb-2" />
          <p className="text-sm font-medium mb-1">Amazing Grace</p>
          <p className="text-xs text-muted-foreground mb-3">Key: G &bull; BPM: 72</p>
          <div className="space-y-1 text-xs text-muted-foreground/80">
            <p>Amazing grace, how sweet the sound</p>
            <p>That saved a wretch like me</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 p-2 rounded border border-border/50 bg-card text-center">
            <BookOpen className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground">Bible Reader</p>
          </div>
          <div className="flex-1 p-2 rounded border border-border/50 bg-card text-center">
            <Music className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground">Song Library</p>
          </div>
        </div>
      </div>
    ),
    communication: (
      <div className="space-y-3">
        <div className="p-3 rounded-lg border border-border/50 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="h-4 w-4 text-rose-500" />
            <p className="text-sm font-medium">Friday Service Update</p>
          </div>
          <p className="text-xs text-muted-foreground">Service time changed to 6:00 PM this week...</p>
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">All members</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">247 reached</span>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-border/50 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium">Volunteer Reminder</p>
          </div>
          <p className="text-xs text-muted-foreground">Your serving slot is tomorrow at 9 AM...</p>
        </div>
      </div>
    ),
    dashboards: (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Active', value: '247', trend: '+12%' },
            { label: 'Attendance', value: '89%', trend: '+3%' },
            { label: 'New Visitors', value: '12', trend: '+8' },
            { label: 'At Risk', value: '3', trend: '-2' },
          ].map((stat) => (
            <div key={stat.label} className="p-2.5 rounded-lg border border-border/50 bg-card">
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-green-600">{stat.trend}</p>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg border border-border/50 bg-card">
          <div className="flex items-end gap-1 h-16">
            {[30, 50, 45, 70, 60, 80, 75, 90, 85].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-cyan-500/20" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    ),
  }

  return mockups[featureId] || null
}

export function FeatureShowcase() {
  const t = useTranslations('marketing')
  const [activeTab, setActiveTab] = useState(0)
  const [paused, setPaused] = useState(false)

  const advance = useCallback(() => {
    setActiveTab((prev) => (prev + 1) % features.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(advance, 5000)
    return () => clearInterval(timer)
  }, [paused, advance])

  const feature = features[activeTab]

  return (
    <section id="features" className="py-20 sm:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          title={t('features.title')}
          subtitle={t('features.subtitle')}
        />

        <AnimatedSection>
          <div
            className="mt-8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Tab buttons */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {features.map((f, i) => {
                const Icon = f.icon
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveTab(i)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all',
                      i === activeTab
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t(`features.${f.id}.title`)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 max-w-md mx-auto mb-8">
              {features.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  {i === activeTab && !paused && (
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      key={activeTab}
                    />
                  )}
                  {i < activeTab && (
                    <div className="h-full bg-primary rounded-full w-full" />
                  )}
                  {i === activeTab && paused && (
                    <div className="h-full bg-primary rounded-full w-1/2" />
                  )}
                </div>
              ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
              >
                {/* Description */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', feature.color)}>
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold">
                      {t(`features.${feature.id}.title`)}
                    </h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {t(`features.${feature.id}.desc`)}
                  </p>
                  <ul className="space-y-2">
                    {[1, 2, 3, 4].map((n) => (
                      <li key={n} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {t(`features.${feature.id}.bullet${n}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mockup */}
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 sm:p-6">
                  <FeatureMockup featureId={feature.id} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}

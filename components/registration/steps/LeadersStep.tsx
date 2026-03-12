'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, X, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface LeaderEntry {
  name: string
  nameAr: string
  title: string
  titleAr: string
}

interface LeadersStepProps {
  leaders: LeaderEntry[]
  onUpdate: (leaders: LeaderEntry[]) => void
  onNext: () => void
  onSkip: () => void
}

const emptyLeader: LeaderEntry = { name: '', nameAr: '', title: '', titleAr: '' }

export function LeadersStep({ leaders, onUpdate, onNext, onSkip }: LeadersStepProps) {
  const t = useTranslations('registration.step5leaders')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const [showForm, setShowForm] = useState(false)
  const [current, setCurrent] = useState<LeaderEntry>({ ...emptyLeader })

  function addLeader() {
    const nameValid = isRTL ? current.nameAr.trim() : (current.name.trim() || current.nameAr.trim())
    const titleValid = isRTL ? current.titleAr.trim() : (current.title.trim() || current.titleAr.trim())
    if (!nameValid || !titleValid) return

    onUpdate([...leaders, { ...current }])
    setCurrent({ ...emptyLeader })
    setShowForm(false)
  }

  function removeLeader(index: number) {
    onUpdate(leaders.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-14 w-14 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4"
        >
          <Users className="h-7 w-7 text-indigo-500" />
        </motion.div>
        <h2 className="text-2xl font-bold tracking-tight">{t('headline')}</h2>
        <p className="text-muted-foreground text-sm">{t('subheadline')}</p>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('infoText')}
        </p>
      </div>

      {/* Added leaders list */}
      {leaders.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {leaders.map((leader, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <span className="text-indigo-600 font-bold text-sm">
                    {(leader.nameAr || leader.name)[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isRTL ? (leader.nameAr || leader.name) : (leader.name || leader.nameAr)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isRTL ? (leader.titleAr || leader.title) : (leader.title || leader.titleAr)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLeader(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add leader form */}
      <AnimatePresence>
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('nameArLabel')}</label>
                  <Input
                    placeholder={t('nameArPlaceholder')}
                    value={current.nameAr}
                    onChange={(e) => setCurrent((p) => ({ ...p, nameAr: e.target.value }))}
                    dir="rtl"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('nameEnLabel')}</label>
                  <Input
                    placeholder={t('nameEnPlaceholder')}
                    value={current.name}
                    onChange={(e) => setCurrent((p) => ({ ...p, name: e.target.value }))}
                    dir="ltr"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('titleArLabel')}</label>
                  <Input
                    placeholder={t('titleArPlaceholder')}
                    value={current.titleAr}
                    onChange={(e) => setCurrent((p) => ({ ...p, titleAr: e.target.value }))}
                    dir="rtl"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('titleEnLabel')}</label>
                  <Input
                    placeholder={t('titleEnPlaceholder')}
                    value={current.title}
                    onChange={(e) => setCurrent((p) => ({ ...p, title: e.target.value }))}
                    dir="ltr"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={addLeader}
                  disabled={
                    !(current.nameAr.trim() || current.name.trim()) ||
                    !(current.titleAr.trim() || current.title.trim())
                  }
                >
                  {t('addButton')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setCurrent({ ...emptyLeader })
                  }}
                >
                  {t('cancelButton')}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-dashed gap-2"
              onClick={() => setShowForm(true)}
            >
              <UserPlus className="h-4 w-4" />
              {t('addLeaderButton')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full h-13 text-base rounded-full gap-2"
          onClick={onNext}
        >
          {leaders.length > 0 ? t('continue') : t('continueEmpty')}
          <ArrowRight className="h-4 w-4" />
        </Button>
        {leaders.length === 0 && (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onSkip}
          >
            {t('skip')}
          </Button>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MILESTONE_TYPE_KEYS = [
  { value: 'baptism', key: 'typeBaptism' },
  { value: 'salvation', key: 'typeSalvation' },
  { value: 'bible_plan_completed', key: 'typeBiblePlan' },
  { value: 'leadership_training', key: 'typeLeadership' },
  { value: 'marriage', key: 'typeMarriage' },
  { value: 'other', key: 'typeOther' },
] as const

interface AddMilestoneProps {
  profileId: string
  churchId: string
}

export function AddMilestone({ profileId, churchId }: AddMilestoneProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations('milestone')

  const milestoneSchema = z.object({
    type: z.enum(['baptism', 'salvation', 'bible_plan_completed', 'leadership_training', 'marriage', 'other']),
    title: z.string().min(1, t('validationTitle')),
    title_ar: z.string().optional(),
    date: z.string().optional(),
    notes: z.string().optional(),
  })

  type MilestoneForm = z.infer<typeof milestoneSchema>

  const form = useForm<MilestoneForm>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      type: 'other',
      title: '',
      title_ar: '',
      date: '',
      notes: '',
    },
  })

  async function onSubmit(values: MilestoneForm) {
    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profile_milestones')
      .insert({
        profile_id: profileId,
        church_id: churchId,
        type: values.type,
        title: values.title,
        title_ar: values.title_ar || null,
        date: values.date || null,
        notes: values.notes || null,
      })

    if (error) {
      setIsLoading(false)
      toast.error(t('toastError'), { description: error.message })
      return
    }

    toast.success(t('toastSuccess'))
    setIsLoading(false)
    setOpen(false)
    form.reset()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          {t('addButton')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('typeLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MILESTONE_TYPE_KEYS.map(mt => (
                        <SelectItem key={mt.value} value={mt.value}>
                          {t(mt.key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('titleLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('titlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dateLabel')}</FormLabel>
                  <FormControl>
                    <Input type="date" dir="ltr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('notesLabel')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('notesPlaceholder')} rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('cancelButton')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

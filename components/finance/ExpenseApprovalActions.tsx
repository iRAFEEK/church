'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface ExpenseApprovalActionsProps {
  expenseId: string
}

export function ExpenseApprovalActions({ expenseId }: ExpenseApprovalActionsProps) {
  const t = useTranslations('finance')
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAction(action: 'approve' | 'reject') {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/finance/expenses/${expenseId}/${action}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error()
      toast.success(action === 'approve' ? t('expenseApproved') : t('expenseRejected'))
      router.refresh()
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" disabled={isSubmitting}>
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmApproveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmApproveBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelAction')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction('approve')} className="bg-green-600 hover:bg-green-700">
              {t('approveExpense')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={isSubmitting}>
            <XCircle className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmRejectTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmRejectBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelAction')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction('reject')} className="bg-red-600 hover:bg-red-700">
              {t('rejectExpense')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

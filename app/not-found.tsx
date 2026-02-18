import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-8xl font-bold text-muted-foreground/20">404</h1>
        <h2 className="text-2xl font-bold">الصفحة غير موجودة</h2>
        <p className="text-muted-foreground">
          الصفحة التي تبحث عنها غير موجودة أو تمت إزالتها.
        </p>
        <Button asChild>
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </div>
  )
}

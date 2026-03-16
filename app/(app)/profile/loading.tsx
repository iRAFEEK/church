import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Profile Header Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 text-center sm:text-start">
              <Skeleton className="h-7 w-40 mx-auto sm:mx-0" />
              <Skeleton className="h-5 w-32 mx-auto sm:mx-0" />
              <div className="flex gap-2 justify-center sm:justify-start">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-4 w-36 mx-auto sm:mx-0" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* I Lead Section Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

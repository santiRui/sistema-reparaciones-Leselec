import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function BillingLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

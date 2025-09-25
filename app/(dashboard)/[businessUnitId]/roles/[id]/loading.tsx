// app/(dashboard)/[businessUnitId]/roles/[id]/loading.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function RoleDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-32" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <Skeleton className="h-5 w-20 mb-2" />
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-6 w-16" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
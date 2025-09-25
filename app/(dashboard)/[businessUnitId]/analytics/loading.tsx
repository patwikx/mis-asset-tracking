// app/(dashboard)/[businessUnitId]/analytics/loading.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asset Trends */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8">
              <Skeleton className="h-12 w-12 mx-auto mb-4" />
              <Skeleton className="h-4 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <Skeleton className="h-5 w-16 mb-2" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="w-3 h-3 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Utilization Rate */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <Skeleton className="h-12 w-20 mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>
              
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-16" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="w-20 h-2 rounded-full" />
                      <Skeleton className="h-4 w-6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { Skeleton } from "@gnd/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Skeleton className="h-12 w-1/3 mb-8" />
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-48" />
          </div>

          {/* Info and Map Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-64 w-full rounded-lg" /> {/* Map placeholder */}
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="mt-12 space-y-6">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}

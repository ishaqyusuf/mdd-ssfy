import { Card, CardContent, CardHeader } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";

export function PackingTabSkeleton() {
    return (
        <>
            <Card>
                <CardHeader className="bg-muted/20">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-28" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-6 w-36" />
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-18" />
                                <Skeleton className="h-4 w-36" />
                            </div>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-8" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-10" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="bg-muted/20">
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="p-4">
                    <div className="space-y-4">
                        {/* Packing Item Skeleton 1 */}
                        <Card className="overflow-hidden">
                            <div className="p-4 bg-muted/10 flex items-center justify-between">
                                <div className="flex-1">
                                    <Skeleton className="h-5 w-48 mb-2" />
                                    <div className="flex gap-4 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Skeleton className="h-4 w-10" />
                                            <Skeleton className="h-4 w-6" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Skeleton className="h-4 w-12" />
                                            <Skeleton className="h-4 w-6" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Skeleton className="h-4 w-14" />
                                            <Skeleton className="h-4 w-6" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </div>
                        </Card>

                        {/* Packing Item Skeleton 2 */}
                        <Card className="overflow-hidden">
                            <div className="p-4 bg-muted/10 flex items-center justify-between">
                                <div className="flex-1">
                                    <Skeleton className="h-5 w-36 mb-2" />
                                    <div className="flex gap-4 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Skeleton className="h-4 w-10" />
                                            <Skeleton className="h-4 w-6" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Skeleton className="h-4 w-12" />
                                            <Skeleton className="h-4 w-6" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Skeleton className="h-4 w-14" />
                                            <Skeleton className="h-4 w-6" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </div>
                        </Card>

                        {/* Expanded Item Skeleton */}
                        <Card className="overflow-hidden">
                            <div className="p-4 bg-muted/10 flex items-center justify-between">
                                <div className="flex-1">
                                    <Skeleton className="h-5 w-44 mb-2" />
                                    <div className="flex gap-4 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Skeleton className="h-4 w-10" />
                                            <Skeleton className="h-4 w-6" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Skeleton className="h-4 w-12" />
                                            <Skeleton className="h-4 w-6" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Skeleton className="h-4 w-14" />
                                            <Skeleton className="h-4 w-6" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </div>

                            {/* Packing Form Skeleton */}
                            <div className="p-4 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Skeleton className="h-4 w-24 mb-1" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Skeleton className="h-4 w-20 mb-1" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-10 flex-1" />
                                            <Skeleton className="h-10 w-16" />
                                            <Skeleton className="h-10 w-16" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Packing History Skeleton */}
                            <div className="p-4 border-t">
                                <Skeleton className="h-4 w-28 mb-3" />
                                <div className="space-y-3">
                                    <div className="grid grid-cols-5 gap-4 items-center">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-8" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-8 w-8" />
                                    </div>
                                    <div className="grid grid-cols-5 gap-4 items-center">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-8" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-8 w-8" />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}


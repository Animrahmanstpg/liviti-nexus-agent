import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PropertyCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border-border/50">
      {/* Image Skeleton */}
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <Skeleton className="h-full w-full" />
      </div>

      <CardContent className="p-5">
        {/* Title & Location */}
        <div className="mb-4 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        {/* Features */}
        <div className="mb-4 flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Price & Type */}
        <div className="flex items-end justify-between pt-3 border-t border-border">
          <div className="space-y-1">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyCardSkeleton;

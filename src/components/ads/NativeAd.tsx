import AdUnit from "./AdUnit";
import { Card } from "@/components/ui/card";

interface NativeAdProps {
  className?: string;
}

const NativeAd = ({ className = "" }: NativeAdProps) => {
  return (
    <Card className={`p-4 border-border/50 bg-muted/30 ${className}`}>
      <AdUnit 
        placement="native_feed"
        className="w-full"
        fallback={null}
      />
    </Card>
  );
};

export default NativeAd;

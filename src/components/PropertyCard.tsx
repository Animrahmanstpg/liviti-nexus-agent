import { Link } from "react-router-dom";
import { Property } from "@/types/property";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Maximize, MapPin } from "lucide-react";

interface PropertyCardProps {
  property: Property;
}

const PropertyCard = ({ property }: PropertyCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-success/10 text-success border-success/20";
      case "reserved":
        return "bg-accent/10 text-accent border-accent/20";
      case "sold":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Link to={`/properties/${property.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-xl">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={property.image}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute right-3 top-3">
            <Badge className={getStatusColor(property.status)}>
              {property.status}
            </Badge>
          </div>
        </div>
        <CardContent className="p-5">
          <div className="mb-3">
            <h3 className="mb-1 text-lg font-semibold line-clamp-1">{property.title}</h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" />
              {property.location}
            </div>
          </div>
          
          <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.bathrooms}</span>
            </div>
            <div className="flex items-center gap-1">
              <Maximize className="h-4 w-4" />
              <span>{property.area} sqft</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-primary">
              ${(property.price / 1000000).toFixed(2)}M
            </div>
            <Badge variant="outline">{property.type}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PropertyCard;

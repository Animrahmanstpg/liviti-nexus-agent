import { Link } from "react-router-dom";
import { Property } from "@/types/property";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Maximize, MapPin, Heart, FolderKanban } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

interface PropertyCardProps {
  property: Property & { project?: { id: string; name: string } | null };
}

const PropertyCard = ({ property }: PropertyCardProps) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const { isFavorite, addFavorite, removeFavorite } = useFavorites(user?.id);
  const isFav = isFavorite(property.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      return;
    }

    if (isFav) {
      removeFavorite(property.id);
    } else {
      addFavorite(property.id);
    }
  };

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
          {user && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-9 w-9"
              onClick={handleFavoriteClick}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-accent text-accent' : ''}`} />
            </Button>
          )}
        </div>
        <CardContent className="p-5">
          <div className="mb-3">
            <h3 className="mb-1 text-lg font-semibold line-clamp-1">{property.title}</h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" />
              {property.location}
            </div>
            {property.project && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <FolderKanban className="mr-1 h-3 w-3" />
                <Link 
                  to={`/projects/${property.project.id}`}
                  className="hover:text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {property.project.name}
                </Link>
              </div>
            )}
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

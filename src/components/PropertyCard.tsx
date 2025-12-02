import { Link } from "react-router-dom";
import { Property } from "@/types/property";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Maximize, MapPin, Heart, FolderKanban, ArrowUpRight } from "lucide-react";
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
        return "bg-success text-success-foreground";
      case "reserved":
        return "bg-warning text-warning-foreground";
      case "sold":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const pricePerSqm = Math.round(property.price / property.area);

  return (
    <Link to={`/properties/${property.id}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-card">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={property.image}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Status Badge */}
          <div className="absolute right-3 top-3">
            <Badge className={`${getStatusColor(property.status)} font-medium shadow-sm`}>
              {property.status}
            </Badge>
          </div>
          
          {/* Favorite Button */}
          {user && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 h-9 w-9 bg-background/90 backdrop-blur-sm hover:bg-background shadow-md"
              onClick={handleFavoriteClick}
            >
              <Heart className={`w-4 h-4 transition-colors ${isFav ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
            </Button>
          )}

          {/* View Arrow */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
        </div>

        <CardContent className="p-5">
          {/* Title & Location */}
          <div className="mb-4">
            <h3 className="mb-1.5 text-lg font-display font-semibold line-clamp-1 text-foreground group-hover:text-primary transition-colors">
              {property.title}
            </h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1.5 h-4 w-4 text-accent" />
              <span className="line-clamp-1">{property.location}</span>
            </div>
            {property.project && (
              <div className="flex items-center text-xs text-muted-foreground mt-1.5">
                <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                <Link 
                  to={`/projects/${property.project.id}`}
                  className="hover:text-primary hover:underline transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {property.project.name}
                </Link>
              </div>
            )}
          </div>
          
          {/* Features */}
          <div className="mb-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Bed className="h-4 w-4" />
              <span className="font-medium text-foreground">{property.bedrooms}</span>
              <span className="hidden sm:inline">Beds</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Bath className="h-4 w-4" />
              <span className="font-medium text-foreground">{property.bathrooms}</span>
              <span className="hidden sm:inline">Baths</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Maximize className="h-4 w-4" />
              <span className="font-medium text-foreground">{property.area.toLocaleString()}</span>
              <span className="hidden sm:inline">m²</span>
            </div>
          </div>

          {/* Price & Type */}
          <div className="flex items-end justify-between pt-3 border-t border-border">
            <div>
              <div className="text-2xl font-display font-bold text-primary">
                ${property.price.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                ${pricePerSqm.toLocaleString()}/m²
              </div>
            </div>
            <Badge variant="outline" className="font-medium capitalize">
              {property.type}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PropertyCard;

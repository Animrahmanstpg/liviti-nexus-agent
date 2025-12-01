import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PropertyCard from "@/components/PropertyCard";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Heart } from "lucide-react";

export default function Favorites() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const { data: favoriteProperties = [], isLoading } = useQuery({
    queryKey: ["favoriteProperties", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: favorites, error: favError } = await supabase
        .from("property_favorites")
        .select("property_id")
        .eq("user_id", user.id);

      if (favError) throw favError;

      if (!favorites || favorites.length === 0) return [];

      const propertyIds = favorites.map(f => f.property_id);
      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select("*")
        .in("id", propertyIds);

      if (propError) throw propError;
      return properties || [];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-accent fill-accent" />
          <h1 className="text-4xl font-bold text-foreground">My Favorites</h1>
        </div>

        {favoriteProperties.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No favorites yet</h2>
            <p className="text-muted-foreground">
              Start adding properties to your favorites to see them here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteProperties.map((property) => (
              <PropertyCard key={property.id} property={property as any} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFavorites = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("property_favorites")
        .select("property_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data.map(f => f.property_id);
    },
    enabled: !!userId,
  });

  const addFavorite = useMutation({
    mutationFn: async (propertyId: string) => {
      if (!userId) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("property_favorites")
        .insert({ user_id: userId, property_id: propertyId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
      toast({
        title: "Added to favorites",
        description: "Property saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add favorite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (propertyId: string) => {
      if (!userId) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("property_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", propertyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
      toast({
        title: "Removed from favorites",
        description: "Property removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove favorite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isFavorite = (propertyId: string) => favorites.includes(propertyId);

  return {
    favorites,
    isLoading,
    isFavorite,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
  };
};

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bed, Bath, Maximize, MapPin } from "lucide-react";

export default function Compare() {
  const [searchParams] = useSearchParams();
  const propertyIds = searchParams.get("ids")?.split(",") || [];

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["compareProperties", propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .in("id", propertyIds);

      if (error) throw error;
      return data || [];
    },
    enabled: propertyIds.length > 0,
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

  if (properties.length === 0) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/properties">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Properties
            </Button>
          </Link>
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-foreground mb-2">No properties to compare</h2>
            <p className="text-muted-foreground mb-6">
              Select properties from the properties page to compare them
            </p>
            <Link to="/properties">
              <Button>Browse Properties</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-success text-success-foreground";
      case "reserved":
        return "bg-accent text-accent-foreground";
      case "sold":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/properties">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Property Comparison</h1>

        <div className={`grid grid-cols-1 ${properties.length === 2 ? 'md:grid-cols-2' : properties.length >= 3 ? 'md:grid-cols-3' : ''} gap-6`}>
          {properties.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={property.image || "/placeholder.svg"}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <Badge className={`absolute top-4 right-4 ${getStatusColor(property.status)}`}>
                  {property.status}
                </Badge>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{property.title}</h2>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{property.location}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="font-semibold text-foreground capitalize">{property.type}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className="font-bold text-primary text-lg">
                      ${Number(property.price).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bedrooms</span>
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{property.bedrooms}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bathrooms</span>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{property.bathrooms}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Area</span>
                    <div className="flex items-center gap-1">
                      <Maximize className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{Number(property.area)} sqm</span>
                    </div>
                  </div>

                  {property.features && Array.isArray(property.features) && property.features.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <span className="text-sm text-muted-foreground mb-2 block">Features</span>
                      <div className="flex flex-wrap gap-2">
                        {(property.features as string[]).map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Link to={`/property/${property.id}`}>
                  <Button className="w-full mt-4">View Details</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

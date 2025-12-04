import { useMemo, useState, useEffect, useCallback } from "react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";

interface PropertyLocationMapProps {
  location: string;
  title: string;
}

const mapContainerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "0.75rem",
};

const defaultCenter = {
  lat: -33.8688,
  lng: 151.2093,
};

const libraries: ("places")[] = ["places"];

const PropertyLocationMap = ({ location, title }: PropertyLocationMapProps) => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeError, setGeocodeError] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const geocodeAddress = useCallback(() => {
    if (!isLoaded || !location) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: location }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        setCoordinates({ lat: lat(), lng: lng() });
        setGeocodeError(false);
      } else {
        console.warn("Geocoding failed:", status);
        setGeocodeError(true);
        setCoordinates(defaultCenter);
      }
    });
  }, [isLoaded, location]);

  useEffect(() => {
    geocodeAddress();
  }, [geocodeAddress]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      clickableIcons: false,
      scrollwheel: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    }),
    []
  );

  if (loadError) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{location}</p>
          <div className="h-[300px] rounded-xl bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">Unable to load map</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded || !coordinates) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{location}</p>
          <div className="h-[300px] rounded-xl bg-muted flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{location}</p>
        {geocodeError && (
          <p className="text-xs text-amber-600">Showing approximate location</p>
        )}
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={15}
          center={coordinates}
          options={mapOptions}
        >
          <Marker position={coordinates} title={title} />
        </GoogleMap>
      </CardContent>
    </Card>
  );
};

export default PropertyLocationMap;

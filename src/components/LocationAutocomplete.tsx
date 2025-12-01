import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useLoadScript } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

const libraries: ("places")[] = ["places"];

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = "Enter location",
  className,
}: LocationAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      fields: ["formatted_address", "address_components", "geometry"],
    });

    // Listen for place selection
    const listener = autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.formatted_address) {
        setInputValue(place.formatted_address);
        onChange(place.formatted_address);
      }
    });

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  if (loadError) {
    return (
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={className}
          disabled
        />
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={inputValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
    />
  );
};

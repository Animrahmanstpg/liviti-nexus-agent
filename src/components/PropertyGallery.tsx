import { useState } from "react";
import { motion } from "framer-motion";
import { Expand, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageLightbox from "@/components/ImageLightbox";

interface PropertyGalleryProps {
  images: string[];
  title: string;
  stats?: {
    bedrooms: number;
    bathrooms: number;
    area: number;
  };
}

const PropertyGallery = ({ images, title, stats }: PropertyGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter out empty/null images
  const validImages = images.filter(Boolean);
  
  // If no valid images, show placeholder
  if (validImages.length === 0) {
    validImages.push('/placeholder.svg');
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  // Single image layout
  if (validImages.length === 1) {
    return (
      <>
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-2xl overflow-hidden group cursor-pointer"
          onClick={() => openLightbox(0)}
        >
          <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
            <img
              src={validImages[0]}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <button 
            className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70 hover:scale-110"
          >
            <Expand className="h-5 w-5" />
          </button>
          
          {stats && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-white">
                  <span className="font-semibold">{stats.bedrooms} Beds</span>
                  <span className="font-semibold">{stats.bathrooms} Baths</span>
                  <span className="font-semibold">{stats.area.toLocaleString()} m²</span>
                </div>
                <span className="text-white/70 text-sm hidden sm:block">Click to view fullscreen</span>
              </div>
            </div>
          )}
        </motion.div>
        
        <ImageLightbox
          images={validImages}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          alt={title}
        />
      </>
    );
  }

  // Multi-image gallery layout
  return (
    <>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        {/* Main large image */}
        <div 
          className="relative rounded-2xl overflow-hidden group cursor-pointer"
          onClick={() => openLightbox(activeIndex)}
        >
          <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
            <img
              src={validImages[activeIndex]}
              alt={`${title} - Image ${activeIndex + 1}`}
              className="h-full w-full object-cover transition-transform duration-500"
            />
          </div>
          
          {/* Navigation arrows for main image */}
          {validImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <button 
            className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70 hover:scale-110"
          >
            <Expand className="h-5 w-5" />
          </button>
          
          {/* Image counter */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
            {activeIndex + 1} / {validImages.length}
          </div>
          
          {stats && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-white">
                  <span className="font-semibold">{stats.bedrooms} Beds</span>
                  <span className="font-semibold">{stats.bathrooms} Baths</span>
                  <span className="font-semibold">{stats.area.toLocaleString()} m²</span>
                </div>
                <span className="text-white/70 text-sm hidden sm:block">Click to view fullscreen</span>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnail grid */}
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {validImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                index === activeIndex
                  ? 'ring-2 ring-primary ring-offset-2 scale-[1.02]'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={image}
                alt={`${title} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </motion.div>
      
      <ImageLightbox
        images={validImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={title}
      />
    </>
  );
};

export default PropertyGallery;

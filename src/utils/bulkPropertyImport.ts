import { supabase } from "@/integrations/supabase/client";

interface ExcelRow {
  Bathroom: string;
  Bedroom: string;
  "Building Name": string;
  City: string;
  "Property Name": string;
  "Property Type": string;
  "Unit Price": string;
  Street: string;
  "Internal Area": string;
  State: string;
  "Unit Number": string;
  "Investment Strategy": string;
  "Parking Space": string;
  Study: string;
  Aspect: string;
}

export async function bulkImportProperties(rows: ExcelRow[]) {
  const properties = rows
    .filter(row => row["Unit Price"] && row["Internal Area"]) // Filter out invalid rows
    .map(row => {
      // Parse price: Remove $ and commas, convert to number
      const priceStr = row["Unit Price"]?.replace(/[$,]/g, "") || "0";
      const price = parseFloat(priceStr) || 0;

      // Parse area: convert to number
      const area = parseFloat(row["Internal Area"]) || 0;

      // Parse bedrooms and bathrooms
      const bedrooms = parseInt(row.Bedroom) || 0;
      const bathrooms = parseInt(row.Bathroom) || 1;

      // Determine property type based on bedrooms
      let type: "apartment" | "villa" | "townhouse" | "penthouse" = "apartment";
      if (bedrooms >= 4) {
        type = "penthouse";
      } else if (bedrooms === 0) {
        type = "apartment"; // Studio
      }

      // Build location from city, state
      const location = `${row.City || ""}, ${row.State || ""}`.trim();

      // Build features from available data
      const features: string[] = [];
      if (row["Investment Strategy"]) {
        const strategies = row["Investment Strategy"].split(";").map(s => s.trim());
        features.push(...strategies);
      }
      if (row["Parking Space"] && parseInt(row["Parking Space"]) > 0) {
        features.push(`${row["Parking Space"]} Parking`);
      }
      if (row.Study) {
        features.push("Study");
      }
      if (row.Aspect) {
        features.push(`${row.Aspect} Aspect`);
      }

      // Build title
      const title = row["Property Name"] || 
        `${bedrooms} Bed ${type.charAt(0).toUpperCase() + type.slice(1)} - ${row["Building Name"] || ""}`.trim();

      // Build description
      const description = `${type.charAt(0).toUpperCase() + type.slice(1)} in ${row["Building Name"] || ""} at ${row.Street || ""}. ${bedrooms} bedroom${bedrooms !== 1 ? 's' : ''}, ${bathrooms} bathroom${bathrooms !== 1 ? 's' : ''}. ${area}sqm internal area.`;

      return {
        title: title.substring(0, 200), // Ensure title isn't too long
        type,
        status: "available" as const,
        price,
        location: location.substring(0, 200),
        bedrooms,
        bathrooms,
        area,
        image: "/placeholder.svg", // Default placeholder image
        description: description.substring(0, 500),
        features: JSON.parse(JSON.stringify(features)), // Convert to JSONB format
      };
    })
    .filter(property => property.price > 0 && property.area > 0); // Additional validation

  // Batch insert - Supabase recommends batches of 1000 or less
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  const errors: any[] = [];

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from("properties")
        .insert(batch);

      if (error) {
        errorCount += batch.length;
        errors.push(error);
        console.error(`Batch ${i / batchSize + 1} failed:`, error);
      } else {
        successCount += batch.length;
      }
    } catch (err) {
      errorCount += batch.length;
      errors.push(err);
      console.error(`Batch ${i / batchSize + 1} exception:`, err);
    }
  }

  return {
    total: properties.length,
    success: successCount,
    failed: errorCount,
    errors,
  };
}

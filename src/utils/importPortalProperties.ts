import { supabase } from "@/integrations/supabase/client";

// Direct import from Portal_Properties.xlsx data
export async function importPortalProperties() {
  const rawData = `||SW|2|2|Block F|Rouse Hill|||Apartments|89||75|SMSF; Low dep %; Discount; Rebate|||3|331|1||2155||RASQ 331 - 2SW|Residential Apartment|zcrm_2612627000565913422|$ 10,933.20|NSW||F3.88|$ 819,990.00|||25 Macquarie Road||
||SW|2|2|Block E|Rouse Hill|||Apartments|83||73|SMSF; Low dep %; Discount; Rebate|||3|237|1||2155||RASQ 237 - 2SW|Residential Apartment|zcrm_2612627000565913421|$ 11,095.75|NSW||E3.61|$ 809,990.00|||25 Macquarie Road||
||SW|2|2|Block E|Rouse Hill|||Apartments|87||76|SMSF; Low dep %; Discount; Rebate|||3|238|1||2155||RASQ 238 - 2SW|Residential Apartment|zcrm_2612627000565913420|$ 10,657.76|NSW||E3.63|$ 809,990.00|||25 Macquarie Road||
||SW|1|1|Block F|Rouse Hill|||Apartments|66||57|SMSF; Low dep %; Discount; Rebate|||3|291|1||2155||RASQ 291 - 1SW|Residential Apartment|zcrm_2612627000565913419|$ 10,877.02|NSW||F3.79|$ 619,990.00|||25 Macquarie Road||`;

  const lines = rawData.trim().split('\n');
  
  const properties = lines.map(line => {
    const cols = line.split('|').map(c => c.trim());
    
    // Column mapping based on the Excel structure
    const aspect = cols[1];
    const bathrooms = parseInt(cols[2]) || 1;
    const bedrooms = parseInt(cols[3]) || 0;
    const buildingName = cols[4];
    const city = cols[5];
    const internalArea = parseFloat(cols[11]) || 0;
    const investmentStrategy = cols[12];
    const level = cols[15];
    const parkingSpace = parseInt(cols[17]) || 0;
    const propertyName = cols[21];
    const unitNumber = cols[27];
    const unitPrice = cols[28].replace(/[$,]/g, '');
    const price = parseFloat(unitPrice) || 0;
    const state = cols[25];
    const street = cols[31];
    
    // Determine type
    let type: "apartment" | "villa" | "townhouse" | "penthouse" = "apartment";
    if (bedrooms >= 4) {
      type = "penthouse";
    }
    
    // Build location
    const location = `${city}, ${state}`;
    
    // Build features
    const features: string[] = [];
    if (investmentStrategy) {
      features.push(...investmentStrategy.split(';').map(s => s.trim()));
    }
    if (parkingSpace > 0) {
      features.push(`${parkingSpace} Parking`);
    }
    if (aspect) {
      features.push(`${aspect} Aspect`);
    }
    
    // Build title
    const title = propertyName || `${bedrooms} Bed ${buildingName} ${unitNumber}`;
    
    // Build description
    const description = `${type.charAt(0).toUpperCase() + type.slice(1)} in ${buildingName} at ${street}. ${bedrooms} bedroom${bedrooms !== 1 ? 's' : ''}, ${bathrooms} bathroom${bathrooms !== 1 ? 's' : ''}. ${internalArea}sqm internal area. Level ${level}.`;
    
    return {
      title: title.substring(0, 200),
      type,
      status: "available" as const,
      price,
      location: location.substring(0, 200),
      bedrooms,
      bathrooms,
      area: internalArea,
      image: "/placeholder.svg",
      description: description.substring(0, 500),
      features: JSON.parse(JSON.stringify(features)),
    };
  }).filter(p => p.price > 0 && p.area > 0);

  // Batch insert
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from("properties")
        .insert(batch);

      if (error) {
        errorCount += batch.length;
        console.error(`Batch ${i / batchSize + 1} failed:`, error);
      } else {
        successCount += batch.length;
      }
    } catch (err) {
      errorCount += batch.length;
      console.error(`Batch ${i / batchSize + 1} exception:`, err);
    }
  }

  return {
    total: properties.length,
    success: successCount,
    failed: errorCount,
  };
}

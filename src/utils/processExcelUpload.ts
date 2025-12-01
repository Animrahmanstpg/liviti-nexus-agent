import { bulkImportProperties } from "./bulkPropertyImport";

/**
 * Process the Portal_Properties.xlsx data that has been parsed
 * This function takes the markdown table output from the document parser
 * and converts it into property records
 */
export async function processPortalPropertiesData(markdownTable: string) {
  const lines = markdownTable.trim().split('\n');
  
  // Find the header line
  const headerLine = lines.find(line => line.includes('|Bathroom|'));
  if (!headerLine) {
    throw new Error('Invalid data format: Header line not found');
  }

  const headerIndex = lines.indexOf(headerLine);
  const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);

  // Process data rows (skip header and separator line)
  const dataRows = lines.slice(headerIndex + 2).filter(line => {
    return line.includes('|') && !line.startsWith('|-') && line.trim().length > 10;
  });

  const rows = dataRows.map(line => {
    const values = line.split('|').map(v => v.trim()).filter((_, i) => i > 0 && i <= headers.length);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });

  // Import the properties
  return await bulkImportProperties(rows);
}

/**
 * Direct import from the Portal_Properties.xlsx parsed data
 * Call this with the full markdown table text from the parser
 */
export const PORTAL_PROPERTIES_MARKDOWN = `
|Adaptable|Aspect|Bathroom|Bedroom|Building Name|City|Colour Scheme|Contract Type|Developer Project Name|External Area|House Area|Internal Area|Investment Strategy|Land Area|Land Price|Level|Lot Number|Parking Space|Parking Type|Postcode|Property Code|Property Name|Property Type|Record Id|Sqm Rate (Price/Sqm)|State|Storage|Unit Number|Unit Price|Building (House) Price|Exclusive|Street|Study|
|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|
`;
// The actual data would be appended here when importing

export type PropertyStatus = "available" | "reserved" | "sold";
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
  description: string;
  features: string[];
}

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export interface Lead {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  propertyInterest?: string;
  budget: number;
  notes: string;
  createdAt: Date;
  lastContact?: Date;
}

export interface EOI {
  id: string;
  propertyId: string;
  leadId: string;
  submittedAt: Date;
  status: "pending" | "approved" | "rejected";
  notes: string;
}

export interface SalesOffer {
  id: string;
  propertyId: string;
  leadId: string;
  offerAmount: number;
  submittedAt: Date;
  status: "pending" | "accepted" | "rejected" | "countered";
  terms: string;
}

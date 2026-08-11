// Vacant-unit listings — the demand-side (prospective tenant) surface of the same
// operating data everywhere else in the app reads from. A vacant unit isn't just a
// gap in the rent roll; it's the exact inventory the make-ready/leasing arm of the
// business needs to fill, so this reuses the same Unit/Property records and Trellis
// Score, never a separate fabricated listings feed.

import type { CityId, ScoreBand, TrellisDataset, UnitConfig } from "../types";
import { computeTrellisScore } from "./trellisScore";
import { makeReadyOpportunity } from "./propertyServices";

export interface VacantListing {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  cityId: CityId;
  cityName: string;
  locality: string;
  config: UnitConfig;
  areaSqft: number;
  rentPerMonth: number;
  amenities: string[];
  developer: string;
  hasLift: boolean;
  reraNumber: string;
  trellisScore: number;
  scoreBand: ScoreBand;
  furnishedRentPotential: number;
}

export function vacantListings(dataset: TrellisDataset): VacantListing[] {
  const propertyById = new Map(dataset.properties.map((p) => [p.id, p]));
  const cityById = new Map(dataset.cities.map((c) => [c.id, c]));
  const scoreCache = new Map<string, number>();
  const bandCache = new Map<string, ScoreBand>();

  return dataset.units
    .filter((u) => u.status === "Vacant")
    .map((u) => {
      const property = propertyById.get(u.propertyId)!;
      const city = cityById.get(property.cityId)!;
      if (!scoreCache.has(property.id)) {
        const result = computeTrellisScore(dataset, property.id);
        scoreCache.set(property.id, result.composite);
        bandCache.set(property.id, result.band);
      }
      const opportunity = makeReadyOpportunity(u);
      return {
        unitId: u.id,
        unitNumber: u.unitNumber,
        propertyId: property.id,
        propertyName: property.name,
        cityId: property.cityId,
        cityName: city.name,
        locality: property.locality,
        config: u.config,
        areaSqft: u.areaSqft,
        rentPerMonth: u.marketRent,
        amenities: property.amenities,
        developer: property.developer,
        hasLift: property.hasLift,
        reraNumber: property.reraNumber,
        trellisScore: scoreCache.get(property.id)!,
        scoreBand: bandCache.get(property.id)!,
        furnishedRentPotential: opportunity.furnishedPotentialRent,
      };
    })
    .sort((a, b) => b.trellisScore - a.trellisScore);
}

export interface ListingsSummary {
  totalVacant: number;
  avgRent: number;
  avgTrellisScore: number;
  citiesCovered: number;
}

export function listingsSummary(listings: VacantListing[]): ListingsSummary {
  const n = listings.length || 1;
  return {
    totalVacant: listings.length,
    avgRent: Math.round(listings.reduce((s, l) => s + l.rentPerMonth, 0) / n),
    avgTrellisScore: Math.round(listings.reduce((s, l) => s + l.trellisScore, 0) / n),
    citiesCovered: new Set(listings.map((l) => l.cityId)).size,
  };
}

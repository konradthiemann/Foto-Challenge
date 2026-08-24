// Freemium pricing: free up to 3 guests, then a 0.99€ micro-tier up to 5,
// then stepwise one-time price per event.
// `upTo` is the inclusive guest limit for the tier; `cents` the one-time price.
export const PRICE_TIERS = [
  { upTo: 3, cents: 0 },
  { upTo: 5, cents: 99 },
  { upTo: 15, cents: 990 },
  { upTo: 30, cents: 1990 },
  { upTo: 60, cents: 3490 },
  { upTo: 120, cents: 4990 },
  { upTo: 200, cents: 6990 },
];

// Smallest tier whose limit covers the requested guest count.
export function tierForGuests(guests) {
  return PRICE_TIERS.find((t) => guests <= t.upTo) || PRICE_TIERS[PRICE_TIERS.length - 1];
}

export function priceCents(guests) {
  return tierForGuests(guests).cents;
}

export function formatEuro(cents) {
  if (cents === 0) return 'Kostenlos';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

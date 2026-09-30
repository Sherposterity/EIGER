// Pure helpers for the pricing page (/pricing). Prices live in
// src/data/plans.json; everything derived from them is computed here so the
// page never carries a hard-coded savings figure.

const WEEKS_PER_YEAR = 52;

// Yearly price spread over twelve months, as a two-decimal string: 35.99 -> "3.00".
export function annualMonthlyEquivalent(annual) {
  return (annual / 12).toFixed(2);
}

// What the weekly plan costs if kept for a year, rounded to cents: 5.99 -> 311.48.
export function weeklyPerYear(weekly) {
  return Math.round(weekly * WEEKS_PER_YEAR * 100) / 100;
}

// Whole percent saved by paying yearly instead of weekly for a year.
export function savingsPercent(annual, weekly) {
  return Math.round((1 - annual / weeklyPerYear(weekly)) * 100);
}

// "$35.99"; whole amounts drop the cents ("$0").
export function formatUsd(n) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

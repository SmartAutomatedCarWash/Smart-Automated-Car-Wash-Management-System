export function formatIntegerRating(value: number | null | undefined, fallback = "--") {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }

  return String(Math.round(value));
}

export function formatRatingOutOfFive(value: number | null | undefined, fallback = "--/5") {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }

  return `${formatIntegerRating(value)}/5`;
}

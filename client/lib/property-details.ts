export function parsePropertyDetails(description?: string | null, tags?: string[] | string | null) {
  const text = [description || "", Array.isArray(tags) ? tags.join(" ") : tags || ""].join(" ");
  const count = (label: string) => {
    const match = text.match(new RegExp(`\\b(\\d+)\\s*(?:${label})\\b`, "i"));
    return match ? Number(match[1]) : null;
  };
  return {
    beds: count("bed(?:room)?s?"),
    baths: count("bath(?:room)?s?"),
    parks: count("car\\s*parks?|parks?|parking\\s*(?:spaces?)?|garages?"),
    agent: text.match(/(?:agent|listed by)\s*:\s*([^\n;|]+)/i)?.[1]?.trim() || null,
  };
}
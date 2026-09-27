import { z } from "zod";

/**
 * A normalized poe.ninja economy line.
 * `primaryValue` is the provider's reference-currency price. It is not a passive score.
 */
export const economyPriceLineSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    primaryValue: z.number().finite(),
    listingCount: z.number().int().nonnegative().nullable(),
    volumePrimaryValue: z.number().finite().nullable(),
    kind: z.enum(["exchange", "stash-item"]),
  })
  .strict();

export type EconomyPriceLine = z.infer<typeof economyPriceLineSchema>;

export const economyLeagueSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();

export type EconomyLeague = z.infer<typeof economyLeagueSchema>;

export const economySnapshotSchema = z
  .object({
    source: z.literal("https://poe.ninja"),
    endpoint: z.enum(["exchange", "stash-item"]),
    leagueId: z.string().min(1),
    category: z.string().min(1),
    referenceCurrency: z.string().min(1).nullable(),
    fetchedAt: z.string().datetime({ offset: true }),
    lines: z.array(economyPriceLineSchema),
  })
  .strict();

export type EconomySnapshot = z.infer<typeof economySnapshotSchema>;

export function parseEconomySnapshot(value: unknown): EconomySnapshot {
  return economySnapshotSchema.parse(value);
}

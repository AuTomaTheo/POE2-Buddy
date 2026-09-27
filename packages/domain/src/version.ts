import { z } from "zod";

/**
 * Provenance for a normalized snapshot.
 * `source` names the adapter or fixture. `commit` is a source revision when one exists.
 */
export const gameDataVersionSchema = z
  .object({
    source: z.string().min(1),
    version: z.string().min(1).optional(),
    commit: z.string().min(1).optional(),
    fetchedAt: z.string().datetime({ offset: true }),
    checksum: z.string().min(1).optional(),
  })
  .strict();

export type GameDataVersion = z.infer<typeof gameDataVersionSchema>;

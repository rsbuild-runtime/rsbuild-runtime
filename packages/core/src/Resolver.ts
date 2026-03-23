import type {
  FeatureResult,
  HookImplementation,
  HookDefinition,
} from './types';

export interface ResolvedHook extends HookImplementation {
  featureId: string;
}

export class Resolver {
  private intents = new Map<string, FeatureResult>();

  public addIntent(id: string, intent: FeatureResult): void {
    this.intents.set(id, intent);
  }

  /**
   * Cross-checks implementations against definitions and detects conflicts.
   */
  public validate(definitions: HookDefinition[]): void {
    const validKeys = new Set(definitions.map((d) => d.key));
    const definedMap = new Map<string, string>();

    for (const def of definitions) {
      if (definedMap.has(def.key)) {
        throw new Error(`[Resolver] Duplicate hook definition: "${def.key}"`);
      }
      definedMap.set(def.key, 'core');
    }

    this.intents.forEach((res, fid) => {
      if (res.implements) {
        for (const key of Object.keys(res.implements)) {
          if (!validKeys.has(key)) {
            throw new Error(
              `[Resolver] Feature "${fid}" implements undefined hook: "${key}"`,
            );
          }
        }
      }
      if (res.overrides) {
        for (const ov of Object.values(res.overrides)) {
          if (!this.intents.has(ov.target)) {
            console.warn(
              `[Resolver] Feature "${fid}" attempts to override non-existent: "${ov.target}"`,
            );
          }
        }
      }
    });
  }

  /**
   * Resolves raw intents into a deterministic execution map.
   */
  public resolve(): Map<string, ResolvedHook[]> {
    const resolvedMap = new Map<string, ResolvedHook[]>();
    const disabledIds = new Set<string>();

    // 1. Global pruning
    this.intents.forEach((res) =>
      res.disableFeatures?.forEach((id) => disabledIds.add(id)),
    );

    const activeIntents = new Map(
      Array.from(this.intents).filter(([id]) => !disabledIds.has(id)),
    );

    // 2. Pre-calculate replacements for O(1) lookup
    const replacementTable = new Map<string, Set<string>>();
    activeIntents.forEach((res) => {
      if (!res.overrides) return;
      Object.entries(res.overrides).forEach(([key, ov]) => {
        if (ov.mode === 'replace') {
          const targets = replacementTable.get(key) ?? new Set();
          targets.add(ov.target);
          replacementTable.set(key, targets);
        }
      });
    });

    // 3. Collect implementations
    activeIntents.forEach((res, fid) => {
      if (!res.implements) return;
      Object.entries(res.implements).forEach(([key, impl]) => {
        if (replacementTable.get(key)?.has(fid)) return;

        const list = resolvedMap.get(key) ?? [];
        list.push({
          ...impl,
          featureId: fid,
          stage: impl.stage ?? res.stage ?? 0,
        });
        resolvedMap.set(key, list);
      });
    });

    // 4. Stable sort by stage, then ID
    resolvedMap.forEach((list) => {
      list.sort((a, b) => {
        const diff = (a.stage ?? 0) - (b.stage ?? 0);
        return diff !== 0 ? diff : a.featureId.localeCompare(b.featureId);
      });
    });

    return resolvedMap;
  }
}

import type {
  FeatureResult,
  HookImplementation,
  HookDefinition,
} from './types';

export interface ResolvedHook extends HookImplementation {
  featureId: string;
}

export class Arbiter {
  private results = new Map<string, FeatureResult>();

  public addResult(id: string, result: FeatureResult): void {
    this.results.set(id, result);
  }

  /**
   * Validates hook consistency.
   * Checks for undefined implementation keys and duplicate definition keys.
   */
  public validate(definitions: HookDefinition[]): void {
    const validKeys = new Set<string>();
    const definedMap = new Map<string, string>(); // key -> featureId

    // 1. Check for duplicate definitions
    for (const def of definitions) {
      if (definedMap.has(def.key)) {
        throw new Error(
          `[Arbiter] Duplicate hook definition: "${def.key}" is already defined.`,
        );
      }
      definedMap.set(def.key, 'core'); // or track which feature defined it if needed
      validKeys.add(def.key);
    }

    this.results.forEach((res, fid) => {
      // 2. Check for invalid implementations
      if (res.implements) {
        Object.keys(res.implements).forEach((key) => {
          if (!validKeys.has(key)) {
            throw new Error(
              `[Arbiter] Feature "${fid}" implements undefined hook: "${key}".`,
            );
          }
        });
      }

      // 3. Check for invalid override targets
      if (res.overrides) {
        Object.values(res.overrides).forEach((ov) => {
          if (!this.results.has(ov.target)) {
            console.warn(
              `[Arbiter] Feature "${fid}" attempts to override non-existent feature: "${ov.target}".`,
            );
          }
        });
      }
    });
  }

  public resolve(): Map<string, ResolvedHook[]> {
    const resolvedMap = new Map<string, ResolvedHook[]>();
    const disabledIds = new Set<string>();

    // 1. Global pruning (disableFeatures)
    this.results.forEach((res) =>
      res.disableFeatures?.forEach((id) => disabledIds.add(id)),
    );

    const activeResults = new Map(
      Array.from(this.results).filter(([id]) => !disabledIds.has(id)),
    );

    // 2. Pre-calculate replacement table for performance
    const replacementTable = new Map<string, Set<string>>(); // hookKey -> Set of replaced featureIds
    activeResults.forEach((res) => {
      if (!res.overrides) return;
      Object.entries(res.overrides).forEach(([hookKey, ov]) => {
        if (ov.mode === 'replace') {
          const replacedSet = replacementTable.get(hookKey) || new Set();
          replacedSet.add(ov.target);
          replacementTable.set(hookKey, replacedSet);
        }
      });
    });

    // 3. Collection with stable filters
    activeResults.forEach((res, fid) => {
      if (!res.implements) return;

      Object.entries(res.implements).forEach(([key, impl]) => {
        // Skip if this specific feature's hook is replaced
        if (replacementTable.get(key)?.has(fid)) return;

        const list = resolvedMap.get(key) || [];
        list.push({
          ...impl,
          featureId: fid,
          stage: impl.stage ?? res.stage ?? 0,
        });
        resolvedMap.set(key, list);
      });
    });

    // 4. Deterministic stable sorting
    resolvedMap.forEach((list) => {
      list.sort((a, b) => {
        const stageDiff = (a.stage ?? 0) - (b.stage ?? 0);
        return stageDiff !== 0
          ? stageDiff
          : a.featureId.localeCompare(b.featureId);
      });
    });

    return resolvedMap;
  }
}

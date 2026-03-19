import type { FeatureResult, HookImplementation } from './types';

export interface ResolvedHook extends HookImplementation {
  featureId: string;
}

export class Arbiter {
  private results = new Map<string, FeatureResult>();

  public addResult(id: string, result: FeatureResult) {
    this.results.set(id, result);
  }

  public resolve(): Map<string, ResolvedHook[]> {
    const resolvedMap = new Map<string, ResolvedHook[]>();
    const disabledIds = new Set<string>();

    // 1. 全局裁断
    this.results.forEach((res) =>
      res.disableFeatures?.forEach((id) => disabledIds.add(id)),
    );
    const activeResults = new Map(
      Array.from(this.results).filter(([id]) => !disabledIds.has(id)),
    );

    // 2. 收集实现
    activeResults.forEach((res, featureId) => {
      if (!res.implements) return;
      Object.entries(res.implements).forEach(([key, impl]) => {
        // 检查覆盖逻辑 (replace)
        if (this.isReplaced(key, featureId, activeResults)) return;

        const list = resolvedMap.get(key) || [];
        list.push({ ...impl, featureId, stage: impl.stage ?? res.stage ?? 0 });
        resolvedMap.set(key, list);
      });
    });

    // 3. 排序
    resolvedMap.forEach((list) => {
      list.sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0)); // 修正：提供默认值 0
    });
    return resolvedMap;
  }

  private isReplaced(
    key: string,
    fid: string,
    results: Map<string, FeatureResult>,
  ) {
    for (const res of results.values()) {
      const override = res.overrides?.[key];
      if (override?.mode === 'replace' && override.target === fid) return true;
    }
    return false;
  }
}

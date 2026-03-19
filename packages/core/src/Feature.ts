import type { FeatureParams, FeatureResult } from './types';

export abstract class Feature<K extends string = string, V = unknown> {
  public get id(): string {
    return this.constructor.name;
  }
  constructor(public readonly key: K) {}
  public abstract apply(
    params: FeatureParams<V>,
  ): Omit<FeatureResult, 'id'> | Promise<Omit<FeatureResult, 'id'>>;
}

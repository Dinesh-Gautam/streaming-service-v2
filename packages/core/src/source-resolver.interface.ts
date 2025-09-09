import type { InjectionToken } from 'tsyringe';

export interface ISourceResolver {
  resolveSource(source: string): Promise<string>;
}

export const DI_TOKENS = {
  SourceResolver: Symbol('SourceResolver') as InjectionToken<ISourceResolver>,
};

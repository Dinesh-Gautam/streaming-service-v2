import type { InjectionToken } from 'tsyringe';

export interface IStorage {
  writeFile(path: string, content: string): Promise<void>;
}

// export const DI_TOKENS = {
//   Storage: Symbol('Storage') as InjectionToken<IStorage>,
// };

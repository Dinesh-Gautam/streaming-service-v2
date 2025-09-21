export interface IStorage {
  writeFile(path: string, content: string): Promise<void>;
}

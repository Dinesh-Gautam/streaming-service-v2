export interface IStorage {
  downloadFile(sourceUrl: string): Promise<string>;
  saveFile(sourcePath: string, destinationPath: string): Promise<string>;
}

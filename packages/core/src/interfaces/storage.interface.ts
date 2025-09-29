export interface IStorage {
  downloadFile(sourceUrl: string): Promise<string>;
  saveFile(sourcePath: string, destinationPath: string): Promise<string>;
  writeFile(
    destinationPath: string,
    data: Buffer | Uint8Array,
  ): Promise<string>;
}

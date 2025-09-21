export interface ISourceResolver {
  /**
   * Gives the file path.
   * It should download the file if it's a remote URL.
   * @param url The original source URL.
   * @returns The local file path where the source can be accessed.
   */
  resolveSource(url: string): Promise<string>;
}

import * as fs from 'fs';
import * as path from 'path';

import type { IStorage } from '../interfaces/storage.interface';

export class LocalStorage implements IStorage {
  private basePath: string;
  private tempDir: string;
  constructor() {
    const defautlErrorMsg = (key: string) =>
      `${key} is required when using Local storage service.`;

    if (!process.env.LOCAL_STORAGE_PATH) {
      throw new Error(defautlErrorMsg('LOCAL_STORAGE_PATH'));
    }

    if (!process.env.TEMP_OUT_DIR) {
      throw new Error(defautlErrorMsg('TEMP_OUT_DIR'));
    }

    this.basePath = process.env.LOCAL_STORAGE_PATH;
    this.tempDir = process.env.TEMP_OUT_DIR;
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async downloadFile(sourceUrl: string): Promise<string> {
    const sourcePath = path.join(this.basePath, sourceUrl);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File not found at ${sourcePath}`);
    }

    const tempDir = this.tempDir;
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, path.basename(sourceUrl));

    fs.copyFileSync(sourcePath, tempFilePath);
    return tempFilePath;
  }

  async saveFile(sourcePath: string, destinationPath: string): Promise<string> {
    const fullDestinationPath = path.join(this.basePath, destinationPath);
    const destDir = path.dirname(fullDestinationPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      fs.cpSync(sourcePath, fullDestinationPath, { recursive: true });
    } else {
      fs.copyFileSync(sourcePath, fullDestinationPath);
    }
    return destinationPath;
  }
}

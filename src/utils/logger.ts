/**
 * @class Logger class
 */
export class Logger {
  public moduleName: string;

  private _prevMessage: string = '';
  /**
   * Constructor
   * @param moduleName - name of the module
   */
  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  /**
   * Log the message
   * @param message - message to log
   */
  log(...messages: any[]) {
    const moduleName = this.moduleName.toUpperCase();

    if (this._prevMessage === JSON.stringify(messages)) return;

    this._prevMessage = JSON.stringify(messages);
    console.log(`${moduleName}:`, ...messages);
  }
}

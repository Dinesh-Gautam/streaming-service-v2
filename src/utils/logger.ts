/**
 * @class Logger class
 */
export class Logger {
  private _name: string;

  /**
   * Constructor
   * @param moduleName - name of the module
   */
  constructor(moduleName: string) {
    this._name = moduleName;
  }

  /**
   * Log the message
   * @param message - message to log
   */
  log(...messages: any[]) {
    const moduleName = this._name.toUpperCase();

    console.log(`${moduleName}:`, ...messages);
  }
}

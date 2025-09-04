export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class JobNotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

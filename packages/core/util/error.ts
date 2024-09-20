export class ResponseError extends Error {
  constructor(
    public readonly response: number,
    message?: string,
    public readonly redirect?: string,
  ) {
    super(message);
    this.name = "ResponseError";
    Object.setPrototypeOf(this, ResponseError.prototype); // needed for ts
  }
}

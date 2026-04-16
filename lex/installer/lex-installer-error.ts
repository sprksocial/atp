export class LexInstallerError extends Error {
  override name = "LexInstallerError";

  constructor(
    public readonly description = "Could not install Lexicons",
    options?: ErrorOptions,
  ) {
    super(description, options);
  }
}

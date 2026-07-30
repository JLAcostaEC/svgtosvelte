import type { Logger } from "./types.js";

/** No-op logger. The default for the library so it produces no output on its own. */
export const silentLogger: Logger = {
  info() {},
  warn() {},
  error() {},
  table() {},
};

/**
 * Basic logger backed by the `console` API, exported for consumers who do not
 * have their own logger. This is what the CLI passes in.
 */
export const consoleLogger: Logger = {
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
  table: (data) => console.table(data),
};

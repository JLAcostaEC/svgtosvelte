export { svgsToSvelte } from "./convert.js";
export { createComponent } from "./component.js";
export { convertCasing, getCleanName, toSafeIdentifier } from "./casing.js";
export { overrideAttributes, mapFilesAttributes } from "./attributes.js";
export { svelteTsTemplate, svelteJsTemplate } from "./templates.js";
export { consoleLogger, silentLogger } from "./logger.js";
export { CASING_FORMATS } from "./types.js";
export type {
  Options,
  CasingFormat,
  AttributeOverride,
  FileWithOverrides,
  ConvertResult,
  RegistryEntry,
  SkipReason,
  Logger,
} from "./types.js";

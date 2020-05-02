import {IMetadata, IMetadataValue, MetadataProxy} from "@typeix/di";
import {isDefined} from "@typeix/utils";

const DNX = /#(.*)/;
/**
 * Return decorator name
 * @param {string} name
 * @returns {string}
 */
export function getDecorator(name: string) {
  if (DNX.test(name)) {
    return name.replace(DNX, "$1");
  }
  return "typeix:rexxar:@" + name;
}

/**
 * Get all metadata
 * @param {Object} token
 * @param {boolean} inherited
 * @returns {IMetadata[]}
 */
export function getAllMetadata(token: Object, inherited = true): IMetadata[] {
  return MetadataProxy.getAllMetadata(token, inherited);
}

/**
 * Get metadata by decorator
 * @param {Object} token
 * @param {string} decorator
 * @returns {IMetadata | undefined}
 */
export function getAllMetadataByDecorator(token: Object, decorator: string): IMetadata[] {
  return getAllMetadata(token).filter(
    (item: IMetadata) => item.metadataKey === getDecorator(decorator)
  );
}

/**
 * Get metadata args
 * @param {Object} token
 * @param {string} targetKey
 * @returns {any}
 */
export function getMetadataByTargetKey(token: Object, targetKey: string): IMetadata[] {
  return getAllMetadata(token).filter(
    (item: IMetadata) => item.targetKey === targetKey
  );
}

/**
 * Get metadata args
 * @param {Object} token
 * @param {string} decorator
 * @param {string} targetKey
 * @returns {any}
 */
export function getMetadata(token: Object, decorator: string, targetKey?: string): IMetadata {
  return getAllMetadata(token).find(
    (item: IMetadata) =>
      item.metadataKey === getDecorator(decorator) && item.targetKey === targetKey
  );
}

/**
 * Get metadata args
 * @param {Object} token
 * @param {string} decorator
 * @param {string} targetKey
 * @returns {any}
 */
export function getMetadataValue(token: Object, decorator: string, targetKey?: string): IMetadataValue {
  let metadata = getMetadata(token, decorator, targetKey);
  if (isDefined(metadata)) {
    return metadata.metadataValue;
  }
  return null;
}

/**
 * Get metadata args
 * @param {Object} token
 * @param {string} decorator
 * @param {string} targetKey
 * @returns {any}
 */
export function getMetadataArgs(token: Object, decorator: string, targetKey?: string): any {
  let metadata: IMetadataValue = getMetadataValue(token, decorator, targetKey);
  if (isDefined(metadata)) {
    return metadata.args;
  }
  return null;
}

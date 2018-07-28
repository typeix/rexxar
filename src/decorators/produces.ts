import {defineMetadata, IMetadataValue} from "@typeix/di";
import {isObject} from "@typeix/utils";

export let PRODUCES_METADATA_KEY = "typeix:rexxar:@Produces";
/**
 * Produces response type
 * @decorator
 * @function
 * @name Produces
 *
 * @param {String} value
 *
 * @description
 * Produces content type
 */
export let Produces = (value: string): MethodDecorator => {
  return (Class: Function, key: string | symbol, descriptor: PropertyDescriptor): any => {
    let metadata: IMetadataValue = {
      args: {
        value
      },
      key,
      name: PRODUCES_METADATA_KEY
    };
    defineMetadata(PRODUCES_METADATA_KEY, metadata, Class, key);
    if (isObject(descriptor)) {
      descriptor.configurable = false;
      descriptor.writable = false;
    }
    return Class;
  };
};

import {IControllerMetadata} from "../interfaces";
import {isArray, isClass} from "@typeix/utils";
import {defineMetadata, IMetadataValue, verifyProviders} from "@typeix/di";

/**
 * Controller metadata key
 * @type {string}
 */
export const CONTROLLER_METADATA_KEY = "typeix:mvc:@Controller";
/**
 * Controller
 * @decorator
 * @function
 * @name Controller
 *
 * @param {IModuleMetadata} config
 * @returns {function(any): any}
 *
 * @description
 * Define controller of application
 */
export let Controller = (config: IControllerMetadata): ClassDecorator => (Class) => {
  if (!isArray(config.providers)) {
    config.providers = [];
  }
  config.providers = verifyProviders(config.providers);
  if (!isClass(Class)) {
    throw new TypeError(`@Controller is allowed only on class`);
  }
  let metadata: IMetadataValue = {
    args: config,
    name: CONTROLLER_METADATA_KEY
  };
  defineMetadata(CONTROLLER_METADATA_KEY, metadata, Class);
  return Class;
};

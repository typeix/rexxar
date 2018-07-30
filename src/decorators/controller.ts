import {isArray, isClass} from "@typeix/utils";
import {defineMetadata, IMetadataValue, IProvider, verifyProviders} from "@typeix/di";
import {TFilter} from "../interfaces";

/**
 * ControllerResolver metadata key
 * @type {string}
 */
export const CONTROLLER_METADATA_KEY = "typeix:rexxar:@Controller";

/**
 * @since 1.0.0
 * @interface
 * @name IControllerMetadata
 *
 * @description
 * ControllerResolver metadata
 */
export interface IControllerMetadata {
  name: string;
  filters?: Array<TFilter>;
  providers?: Array<IProvider|Function>;
}
/**
 * ControllerResolver
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

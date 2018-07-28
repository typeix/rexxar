import {Module as AModule, IModuleMetadata as AIModuleMetadata} from "@typeix/modules";
import {IProvider} from "@typeix/di";
import {isUndefined, ServerError} from "@typeix/utils";

/**
 * @since 1.0.0
 * @interface
 * @name ControllerModuleMetadata
 * @param {Array<Function|IProvider>} imports
 * @param {Array<Function|IProvider>} exports
 * @param {Array<IProvider|Function>} providers
 * @param {Array<IProvider|Function>} controllers
 *
 * @description
 * ControllerModuleMetadata metadata
 */
export interface ControllerModuleMetadata extends AIModuleMetadata {
  controllers: Array<Function | IProvider>;
  name?: string;
}

/**
 * @since 1.0.0
 * @interface
 * @name IModuleMetadata
 * @param {Array<Function|IProvider>} imports
 * @param {Array<Function|IProvider>} exports
 * @param {Array<IProvider|Function>} providers
 * @param {Array<IProvider|Function>} controllers
 * @param {String} name
 *
 * @description
 * IModuleMetadata metadata
 */
export interface IModuleMetadata extends ControllerModuleMetadata {
  name: string;
}

/**
 * Module decorator
 * @decorator
 * @function
 * @name Module
 *
 * @param {IModuleMetadata} config
 * @returns {function(any): any}
 *
 * @description
 * Define module in your application
 *
 * @example
 * import {Module, Logger, Router} from "@typeix/rexxar";
 *
 * \@Module({
 *  providers:[Logger, Router]
 * })
 * class Application{
 *    constructor(router: Router) {
 *
 *    }
 * }
 */
export let Module = (config: IModuleMetadata): ClassDecorator => AModule(config);

/**
 * Bootstrap module name
 * @type {string}
 */
export const BOOTSTRAP_MODULE = "root";
/**
 * Module decorator
 * @decorator
 * @function
 * @name RootModule
 *
 * @param {IModuleMetadata} config
 * @returns {function(any): any}
 *
 * @description
 * Define module in your application
 *
 * @example
 * import {Module, Logger, Router} from "@typeix/rexxar";
 *
 * \@RootModule({
 *  providers:[Logger, Router]
 * })
 * class Application{
 *    constructor(router: Router) {
 *
 *    }
 * }
 */
export let RootModule = (config: ControllerModuleMetadata): ClassDecorator => {
  if (isUndefined(config.name)) {
    config.name = BOOTSTRAP_MODULE;
  } else if (config.name !== BOOTSTRAP_MODULE) {
    throw new ServerError(500, "RootModule name must be root");
  }
  return AModule(config);
};

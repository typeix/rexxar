import {Module as AModule, IModuleMetadata as AIModuleMetadata} from "@typeix/modules";
import {IProvider} from "@typeix/di";

/**
 * @since 1.0.0
 * @interface
 * @name IModuleMetadata
 * @param {Array<Function|IProvider>} imports
 * @param {Array<Function|IProvider>} exports
 * @param {Array<IProvider|Function>} providers
 * @param {Array<IProvider|Function>} controllers
 *
 * @description
 * Bootstrap class config metadata
 */
export interface IModuleMetadata extends AIModuleMetadata{
  controllers: Array<Function | IProvider>;
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

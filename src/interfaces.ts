import {IProvider} from "@typeix/di";


/**
 * @since 1.0.0
 * @interface
 * @name IFilter
 *
 * @description
 * Filter for controller before and after processing
 */
export interface IFilter {
  before(data: string | Buffer): string | Buffer | Promise<string | Buffer>;
  after(data: string | Buffer): string | Buffer | Promise<string | Buffer>;
}

/**
 * @since 1.0.0
 * @interface
 * @name IControllerMetadata
 *
 * @description
 * Controller metadata
 */
export interface IControllerMetadata {
  name: string;
  filters?: Array<TFilter>;
  providers?: Array<IProvider|Function>;
}
/**
 * @since 1.0.0
 * @interface
 * @name IFilter
 *
 * @description
 * Filter for controller before and after processing
 */
export interface TFilter {
  new (): IFilter;
}

import {defineMetadata, IMetadataValue} from "@typeix/di";

/**
 * metadata key
 * @type {string}
 */
export const FILTER_METADATA_KEY = "typeix:rexxar:@Filter";

/**
 * @since 1.0.0
 * @decorator
 * @function
 * @name Filter
 *
 * @description
 * Filter is used as pre controller and after controller actions
 *
 * @example
 * import {IFilter, Filter, Request, Inject} from "@typeix/rexxar";
 *
 * \@Filter(100)
 * export class Cache implements IFilter {
 *
 *  \@Inject(Request)
 *  request: Request;
 *
 *
 *  before(): string|Buffer|Promise<string|Buffer> {
 *    return "Before controller";
 *  }
 *
 *  after(data: string): string|Buffer|Promise<string|Buffer> {
 *    return "After controller <- " + data;
 *  }
 *
 *}
 */

export let Filter = (priority: number, route: string = "*"): ClassDecorator => {
  return (Class: Function): any => {
    let metadata: IMetadataValue = {
      args: {
        priority,
        route
      },
      name: FILTER_METADATA_KEY
    };
    defineMetadata(FILTER_METADATA_KEY, metadata, Class);
    return Class;
  };
}

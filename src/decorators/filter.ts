import {createClassDecorator} from "@typeix/metadata";

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

export function Filter(priority: number, route: string = "*") {
  return createClassDecorator(Filter, {priority, route});
}

import {createMethodDecorator} from "@typeix/metadata";

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
export function Produces(value: string): MethodDecorator {
  return createMethodDecorator(Produces, {value});
}

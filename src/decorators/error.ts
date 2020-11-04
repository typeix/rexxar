import {createParameterDecorator} from "@typeix/metadata";
/**
 * @since 1.0.0
 * @decorator
 * @function
 * @name Error
 *
 * @description
 * Chain propagate data from FilterBefore -> BeforeEach -> Before -> Action -> After -> AfterEach -> FilterAfter
 *
 * @example
 * import {Chain, Param, ControllerResolver, Action, Inject} from "@typeix/rexxar";
 *
 * \@ControllerResolver({
 *    name: "core"
 * })
 * class MyController{
 *
 *     \@Action("error")
 *     actionIndex(@ErrorMessage() data) {
 *        return "My Index " + data;
 *     }
 * }
 */

export function ErrorMessage() {
  return createParameterDecorator(ErrorMessage);
}

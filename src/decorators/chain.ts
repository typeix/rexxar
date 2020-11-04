import {createParameterDecorator} from "@typeix/metadata";
/**
 * @since 1.0.0
 * @decorator
 * @function
 * @name Chain
 *
 * @description
 * Chain propagate data from FilterBefore -> BeforeEach -> Before -> Action -> After -> AfterEach -> FilterAfter
 *
 * @example
 * import {Chain, Param, ControllerResolver, Action, Inject} from "@typeix/rexxar";
 *
 * \@ControllerResolver({
 *    name: "myController"
 * })
 * class MyController{
 *
 *     \@Before("index")
 *     actionIndex() {
 *        return "My Index";
 *     }
 *
 *     \@Action("index")
 *     actionIndex(@Chain() data, @Param("file") file: string) {
 *        return "My Index " + data;
 *     }
 * }
 */


export function Chain() {
  return createParameterDecorator(Chain);
}

import {defineMetadata, IMetadataValue} from "@typeix/di";

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
 * import {Chain, Param, Controller, Action, Inject} from "@typeix/rexxar";
 *
 * \@Controller({
 *    name: "core"
 * })
 * class MyController{
 *
 *     \@Action("error")
 *     actionIndex(@ErrorMessage data) {
 *        return "My Index " + data;
 *     }
 * }
 */
export let ErrorMessage: ParameterDecorator = (Class: Object, key: string | symbol, paramIndex: number): void => {
  let METADATA_KEY = "typeix:mvc:@ErrorMessage";
  let metadata: IMetadataValue = {
    args: {},
    key,
    name: METADATA_KEY,
    paramIndex
  };
  defineMetadata(METADATA_KEY, metadata, Class, key);
};

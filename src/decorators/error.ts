import {defineMetadata, IMetadataValue} from "@typeix/di";

export let ERROR_MESSAGE_METADATA_KEY = "typeix:rexxar:@ErrorMessage";
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
 *     actionIndex(@ErrorMessage data) {
 *        return "My Index " + data;
 *     }
 * }
 */
export let ErrorMessage: ParameterDecorator = (Class: Object, key: string | symbol, paramIndex: number): void => {

  let metadata: IMetadataValue = {
    args: {},
    key,
    name: ERROR_MESSAGE_METADATA_KEY,
    paramIndex
  };
  defineMetadata(ERROR_MESSAGE_METADATA_KEY, metadata, Class, key);
};

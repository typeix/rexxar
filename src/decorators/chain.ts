import {defineMetadata, IMetadataValue} from "@typeix/di";

export let CHAIN_METADATA_KEY = "typeix:rexxar:@Chain";
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
 * import {Chain, Param, Controller, Action, Inject} from "@typeix/rexxar";
 *
 * \@Controller({
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
 *     actionIndex(@Chain data, @Param("file") file: string) {
 *        return "My Index " + data;
 *     }
 * }
 */
export let Chain: ParameterDecorator = (Class: Object, key: string | symbol, paramIndex: number): void => {

  let metadata: IMetadataValue = {
    args: {},
    key,
    name: CHAIN_METADATA_KEY,
    paramIndex
  };
  defineMetadata(CHAIN_METADATA_KEY, metadata, Class, key);
};

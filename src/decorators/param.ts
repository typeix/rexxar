import {defineMetadata, IMetadataValue} from "@typeix/di";
import {isDefined} from "@typeix/utils";

export let PARAM_METADATA_KEY = "typeix:rexxar:@Param";
/**
 * @since 1.0.0
 * @decorator
 * @function
 * @name Param
 *
 * @description
 * Define Param metadata to deliver it from router
 *
 * @example
 * import {Param, ControllerResolver, Action, Inject} from "@typeix/rexxar";
 *
 * \@ControllerResolver({
 *    name: "myController"
 * })
 * class MyController{
 *
 *     \@Inject(AssetLoader)
 *     myAssetLoaderService: AssetLoader;
 *
 *     \@Action("index")
 *     assetLoader(@Param("file") file: string) {
 *        return this.myAssetLoaderService.load(file);
 *     }
 * }
 */
export let Param = (value: string): ParameterDecorator => {
  return (Class: Object, key: string | symbol, paramIndex: number): void => {
    let metadata: IMetadataValue = {
      args: {
        value
      },
      key,
      name: PARAM_METADATA_KEY,
      paramIndex
    };
    defineMetadata(PARAM_METADATA_KEY, metadata, Class, key);
  };
};

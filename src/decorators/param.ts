import {createParameterDecorator} from "@typeix/metadata";

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
export function Param(value: string): ParameterDecorator {
  return createParameterDecorator(Param, {value});
}

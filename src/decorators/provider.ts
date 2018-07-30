import {defineMetadata, IMetadataValue, UProvider, verifyProviders} from "@typeix/di";

/**
 * metadata key
 * @type {string}
 */
export const PROVIDER_METADATA_KEY = "typeix:rexxar:@Provider";

/**
 * @since 1.0.0
 * @decorator
 * @function
 * @name Provider
 *
 * @description
 * Provider decorator is used to define injectable and injections for class itself
 *
 * @example
 * import {Provider} from "@typeix/rexxar";
 * import {MyService} form "./services/my-service";
 *
 * \@Provider([MyService])
 * class AssetLoader{
 *    constructor(myService: MyService) {
 *
 *    }
 * }
 */
export let Provider = (config: Array<UProvider>): ClassDecorator => {
  return (Class: Function): any => {
    let metadata: IMetadataValue = {
      args: verifyProviders(config),
      name: PROVIDER_METADATA_KEY
    };
    defineMetadata(PROVIDER_METADATA_KEY, metadata, Class);
    return Class;
  };
}

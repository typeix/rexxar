import {createClassDecorator} from "@typeix/metadata";
import {UProvider} from "@typeix/di";
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

export function Provider(config: Array<UProvider>): ClassDecorator {
  return createClassDecorator(Provider, {config});
}

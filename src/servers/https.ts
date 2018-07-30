import {createServer, ServerOptions} from "https";
import {IncomingMessage, ServerResponse} from "http";
import {ModuleInjector} from "@typeix/modules";
import {IModuleMetadata} from "..";
import {getMetadataArgs} from "../helpers/metadata";
import {isString, Logger, ServerError} from "@typeix/utils";
import {fireRequest} from "../resolvers/request";

export interface HttpsServerConfig {
  options: ServerOptions;
  port: number;
  hostname?: string;
}
/**
 * @since 1.0.0
 * @function
 * @name httpsServer
 * @param {Function} Class httpsServer class
 * @param {Number} config HttpServerConfig
 * @returns {Injector}
 *
 * @description
 * Use httpsServer function to https an Module.
 */
export function httpsServer(Class: Function, config: HttpsServerConfig): ModuleInjector {

  let metadata: IModuleMetadata = getMetadataArgs(Class, "#typeix:@Module");
  if (metadata.name != "root") {
    throw new ServerError(500, "Server can be initialized on on @RootModule")
  }
  let moduleInjector = ModuleInjector.createAndResolve(Class);
  let injector = moduleInjector.getInjector(Class);
  let logger: Logger = injector.get(Logger);
  let server = createServer(config.options, (request: IncomingMessage, response: ServerResponse) =>
      fireRequest(moduleInjector, request, response)
  );
  if (isString(config.hostname)) {
    server.listen(config.port, config.hostname);
  } else {
    server.listen(config.port);
  }

  logger.info("Module.info: Server started", config);
  server.on("error", (e) => logger.error(e.stack));

  return moduleInjector;
}
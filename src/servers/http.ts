import {createServer, IncomingMessage, ServerResponse} from "http";
import {MODULE_METADATA_KEY, ModuleInjector} from "@typeix/modules";
import {getMetadataArgs} from "../helpers/metadata";
import {isString, Logger} from "@typeix/utils";
import {fireRequest} from "../resolvers/request";
import {BOOTSTRAP_MODULE, RootModuleMetadata} from "../decorators/module";
import {ServerError} from "@typeix/router";

export interface HttpServerConfig {
  port: number;
  hostname?: string;
}
/**
 * @since 1.0.0
 * @function
 * @name httpServer
 * @param {Function} Class httpServer class
 * @param {Number} config HttpServerConfig
 * @returns {Injector}
 *
 * @description
 * Use httpServer function to httpServer an Module.
 */
export function httpServer(Class: Function, config: HttpServerConfig): ModuleInjector {

  let metadata: RootModuleMetadata = getMetadataArgs(Class, MODULE_METADATA_KEY);
  if (metadata.name != BOOTSTRAP_MODULE) {
    throw new ServerError(500, "Server must be initialized on @RootModule")
  }
  let moduleInjector = ModuleInjector.createAndResolve(Class, metadata.shared_providers);
  let injector = moduleInjector.getInjector(Class);
  let logger: Logger = injector.get(Logger);
  let server = createServer();

  server.on("request",
    (request: IncomingMessage, response: ServerResponse) =>
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

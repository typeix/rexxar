import {createServer, ServerOptions} from "https";
import {IncomingMessage, ServerResponse} from "http";
import {MODULE_METADATA_KEY, ModuleInjector} from "@typeix/modules";
import {getMetadataArgs} from "../helpers/metadata";
import {isString, Logger} from "@typeix/utils";
import {fireRequest} from "../resolvers/request";
import {BOOTSTRAP_MODULE, RootModuleMetadata} from "../decorators/module";
import {ServerError} from "@typeix/router";

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

  let metadata: RootModuleMetadata = getMetadataArgs(Class, MODULE_METADATA_KEY);
  if (metadata?.name != BOOTSTRAP_MODULE) {
    throw new ServerError(500, "Server must be initialized on @RootModule")
  }
  let moduleInjector = ModuleInjector.createAndResolve(Class, metadata.shared_providers);
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

import {createServer, ServerOptions} from "https";
import {IncomingMessage, ServerResponse} from "http";
import {ModuleInjector} from "@typeix/modules";
import {isDefined, isString} from "@typeix/utils";
import {fireRequest} from "../resolvers/request";
import {BOOTSTRAP_MODULE, RootModule, RootModuleMetadata} from "../decorators/module";
import {RouterError} from "@typeix/router";
import {getClassMetadata} from "@typeix/metadata";
import {Logger} from "log4js";
import {Action, After, AfterEach, Before, BeforeEach, Chain, ErrorMessage, LOGGER, Param} from "../index";
import {Inject} from "@typeix/di";
import {REXXAR_CONFIG} from "./constants";

export interface HttpsServerConfig {
  options: ServerOptions;
  port: number;
  hostname?: string;
  actions?: Array<Function>;
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

  let metadata: RootModuleMetadata = getClassMetadata(RootModule, Class)?.args;
  if (metadata?.name != BOOTSTRAP_MODULE) {
    throw new RouterError(500, "Server must be initialized on @RootModule", metadata);
  }
  let moduleInjector = ModuleInjector.createAndResolve(Class, metadata.shared_providers);
  let injector = moduleInjector.getInjector(Class);
  let logger: Logger = injector.get(LOGGER);

  /**
   * Set config
   */
  if (!isDefined(config.actions)) {
    config.actions = [BeforeEach, Before, Action, After, AfterEach];
  }

  injector.set(REXXAR_CONFIG, config)


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

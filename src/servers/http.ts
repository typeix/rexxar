import {createServer, IncomingMessage, ServerResponse} from "http";
import {ModuleInjector} from "@typeix/modules";
import {isString, isDefined} from "@typeix/utils";
import {fireRequest} from "../resolvers/request";
import {BOOTSTRAP_MODULE, RootModule, RootModuleMetadata} from "../decorators/module";
import {RouterError} from "@typeix/router";
import {getClassMetadata} from "@typeix/metadata";
import {Logger} from "log4js";
import {Action, After, AfterEach, Before, BeforeEach, Chain, ErrorMessage, LOGGER, Param} from "../index";
import {REXXAR_CONFIG} from "./constants";
import {Inject} from "@typeix/di";

export interface HttpServerConfig {
  port: number;
  hostname?: string;
  actions?: Array<Function>;
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

  let metadata: RootModuleMetadata = getClassMetadata(RootModule, Class)?.args;
  if (metadata.name != BOOTSTRAP_MODULE) {
    throw new RouterError(500, "Server must be initialized on @RootModule", {});
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

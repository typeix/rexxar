import {createServer, IncomingMessage, ServerResponse} from "http";
import {ModuleInjector, Module} from "@typeix/modules";
import {isString, isDefined} from "@typeix/utils";
import {fireRequest} from "../resolvers/request";
import {BOOTSTRAP_MODULE, RootModuleMetadata} from "../decorators/module";
import {RouterError} from "@typeix/router";
import {getClassMetadata} from "@typeix/metadata";
import {Action, After, AfterEach, Before, BeforeEach} from "../index";
import {ACTION_CONFIG} from "./constants";
import {Logger} from "@typeix/logger";

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
 * @returns {ModuleInjector}
 *
 * @description
 * Use httpServer function to httpServer an Module.
 */
export function httpServer(Class: Function, config: HttpServerConfig): ModuleInjector {

  let metadata: RootModuleMetadata = getClassMetadata(Module, Class)?.args;
  if (metadata.name != BOOTSTRAP_MODULE) {
    throw new RouterError(500, "Server must be initialized on @RootModule", {});
  }

  metadata.shared_providers.push({
    provide: ACTION_CONFIG,
    useValue: isDefined(config.actions) ? config.actions : [BeforeEach, Before, Action, After, AfterEach]
  });

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

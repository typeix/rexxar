import {createServer, ServerOptions} from "https";
import {IncomingMessage, ServerResponse} from "http";
import {ModuleInjector, Module} from "@typeix/modules";
import {isDefined, isString} from "@typeix/utils";
import {fireRequest} from "../resolvers/request";
import {BOOTSTRAP_MODULE, RootModuleMetadata} from "../decorators/module";
import {RouterError} from "@typeix/router";
import {getClassMetadata} from "@typeix/metadata";
import {Action, After, AfterEach, Before, BeforeEach} from "../index";
import {ACTION_CONFIG} from "./constants";
import {Logger} from "@typeix/logger";

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

  let metadata: RootModuleMetadata = getClassMetadata(Module, Class)?.args;
  if (metadata?.name != BOOTSTRAP_MODULE) {
    throw new RouterError(500, "Server must be initialized on @RootModule", metadata);
  }
  let moduleInjector = ModuleInjector.createAndResolve(Class, metadata.shared_providers);
  let injector = moduleInjector.getInjector(Class);
  let logger: Logger = injector.get(Logger);

  /**
   * Set config
   */
  if (!isDefined(config.actions)) {
    config.actions = [BeforeEach, Before, Action, After, AfterEach];
  }

  injector.set(ACTION_CONFIG, config.actions);


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

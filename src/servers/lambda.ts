import {ModuleInjector, Module} from "@typeix/modules";
import {isDefined, isString} from "@typeix/utils";
import {fireRequest} from "../resolvers/request";
import {BOOTSTRAP_MODULE,  RootModuleMetadata} from "../decorators/module";
import {FakeIncomingMessage, FakeServerResponse} from "../helpers/mocks";
import {LAMBDA_CONTEXT, LAMBDA_EVENT, ACTION_CONFIG} from "./constants";
import {RouterError} from "@typeix/router";
import {getClassMetadata} from "@typeix/metadata";
import {Action} from "../index";
import {Logger} from "@typeix/logger";

export interface LambdaServerConfig {
  path?: string;
  httpMethod?: string;
  actions?: Array<Function>;
}

/**
 * @since 2.1.0
 * @function
 * @name isProxyAuthEvent
 * @param {Function} event
 */
function isProxyAuthEvent(event: any): boolean {
  return isString(event.type) && isString(event.methodArn);
}
/**
 * @since 2.1.0
 * @function
 * @name isProxyEvent
 * @param {Function} event
 */
function isProxyEvent(event: any): boolean {
  return isString(event.path) && isString(event.httpMethod) && !isProxyAuthEvent(event);
}
/**
 * @since 2.1.0
 * @function
 * @name lambdaServer
 * @param {Function} Class httpsServer class
 * @param {LambdaServerConfig} config lambda server config
 *
 * @description
 * Use httpsServer function to https an Module.
 */
export function lambdaServer(Class: Function, config: LambdaServerConfig = {}) {
  let metadata: RootModuleMetadata = getClassMetadata(Module, Class)?.args;
  if (metadata.name != BOOTSTRAP_MODULE) {
    throw new RouterError(500, "Server must be initialized on @RootModule", metadata);
  }

  metadata.shared_providers.push({
    provide: ACTION_CONFIG,
    useValue: isDefined(config.actions) ? config.actions : [Action]
  });

  let moduleInjector = ModuleInjector.createAndResolve(Class, metadata.shared_providers);
  let injector = moduleInjector.getInjector(Class);
  let logger: Logger = injector.get(Logger);

  logger.info("Module.info: Lambda Server started");
  return async (event: any, context: any, callback: any) => {
    logger.debug(LAMBDA_EVENT + "_" + context.awsRequestId, event);
    logger.debug(LAMBDA_CONTEXT + "_" + context.awsRequestId, context);
    injector.set(LAMBDA_EVENT, event);
    injector.set(LAMBDA_CONTEXT, context);
    let fakeRequest = new FakeIncomingMessage();
    if (isProxyEvent(event)) {
      fakeRequest.url = event.path;
      fakeRequest.method = event.httpMethod;
      if (event.multiValueQueryStringParameters) {
        fakeRequest.url += "?" + Object
          .keys(event.multiValueQueryStringParameters)
          .map(k => event.multiValueQueryStringParameters[k].map(v => k + "=" + v).join("&"))
          .join("&");
      }
      if (event.body) {
        process.nextTick(() => {
          fakeRequest.emit("data", event.body);
          fakeRequest.emit("end");
        });
      }
    } else if (isProxyEvent(config)) {
      fakeRequest.url = config.path;
      fakeRequest.method = config.httpMethod;
    }
    let response = new FakeServerResponse();
    try {
      let body = await fireRequest(moduleInjector, fakeRequest, response);
      logger.debug(LAMBDA_EVENT + "_RESPONSE_" + context.awsRequestId, body);
      if (isProxyEvent(event)) {
        if (body instanceof Buffer) {
          body = <string>body.toString('utf8');
        }
        return callback(null, {
          body: body,
          headers: <any>response.getHeaders(),
          statusCode: response.getStatusCode(),
          isBase64Encoded: event.isBase64Encoded
        })
      } else {
        return callback(null, body);
      }
    } catch (e) {
      logger.error(LAMBDA_EVENT + "_RESPONSE_" + context.awsRequestId, e);
      return callback(e);
    }
  }
}


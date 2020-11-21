import {ModuleInjector, Module} from "@typeix/modules";
import {Injector} from "@typeix/di";
import {isDefined, isFunction, isObject, isString, isUndefined} from "@typeix/utils";
import {fireRequest} from "../resolvers/request";
import {BOOTSTRAP_MODULE, RootModuleMetadata} from "../decorators/module";
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
 * @name isGatewayProxyAuthEvent
 * @param {Function} event
 */
function isGatewayProxyAuthEvent(event: any): boolean {
  return isString(event.type) && isString(event.methodArn);
}

/**
 * @since 2.1.0
 * @function
 * @name isGatewayProxyEvent
 * @param {Function} event
 */
function isGatewayProxyEvent(event: any): boolean {
  return isRoutingEvent(event) &&
    isObject(event.requestContext) &&
    isString(event.requestContext.resourceId) &&
    isString(event.requestContext.requestId) &&
    isString(event.requestContext.apiId);
}

/**
 * @since 4.0.6
 * @function
 * @name isRoutingEvent
 * @param {Function} event
 */
function isRoutingEvent(event: any): boolean {
  return isString(event.path) && isString(event.httpMethod);
}

/**
 * @since 2.1.0
 * @function
 * @name lambdaServer
 * @param {Function} Class httpsServer class
 * @param {LambdaServerConfig} config lambda server config
 * @param {Function} interceptor
 *
 * @description
 * Use httpsServer function to https an Module.
 */
export declare type LambdaInterceptor = (
  request: {
    event: any,
    context: any,
    isGatewayProxyEvent: boolean,
    isGatewayProxyAuthEvent: boolean
  },
  forward: (route: string, method: string) => void
) => void;

export function lambdaServer(Class: Function,
                             config: LambdaServerConfig = {},
                             interceptor?: LambdaInterceptor) {
  let metadata: RootModuleMetadata = getClassMetadata(Module, Class)?.args;
  if (metadata.name != BOOTSTRAP_MODULE) {
    throw new RouterError(500, "Server must be initialized on @RootModule", metadata);
  }

  metadata.shared_providers.push({
    provide: ACTION_CONFIG,
    useValue: isDefined(config.actions) ? config.actions : [Action]
  });

  let moduleInjector = ModuleInjector.createAndResolve(
    Class,
    metadata.shared_providers,
    [LAMBDA_EVENT, LAMBDA_CONTEXT]
  );
  let injector = moduleInjector.getInjector(Class);
  let logger: Logger = injector.get(Logger);

  logger.info("Module.info: Lambda Server started");
  return async (event: any, context: any, callback: any) => {
    let fakeRequest = new FakeIncomingMessage();
    if (isFunction(interceptor)) {
      interceptor(
        {
          event: Object.assign({}, event),
          context: Object.assign({}, context),
          isGatewayProxyEvent: isGatewayProxyEvent(event),
          isGatewayProxyAuthEvent: isGatewayProxyAuthEvent(event)
        },
        (route: string, method: string) => {
          fakeRequest.url = route;
          fakeRequest.method = method;
          logger.debug("Forwarding", {
            route,
            method
          });
        }
      );
    }
    logger.debug(LAMBDA_EVENT + "_" + context.awsRequestId, event);
    logger.debug(LAMBDA_CONTEXT + "_" + context.awsRequestId, context);
    injector.set(LAMBDA_EVENT, event);
    injector.set(LAMBDA_CONTEXT, context);
    if (isGatewayProxyEvent(event)) {
      fakeRequest.url = event.path;
      fakeRequest.method = event.httpMethod;
      if (event.multiValueQueryStringParameters) {
        fakeRequest.url += "?" + Reflect
          .ownKeys(event.multiValueQueryStringParameters)
          .map(k => event.multiValueQueryStringParameters[k].map(v => k.toString() + "=" + v).join("&"))
          .join("&");
      } else if (event.queryStringParameters) {
        fakeRequest.url += "?" + Reflect
          .ownKeys(event.queryStringParameters)
          .map(k => k.toString() + "=" + event.queryStringParameters[k])
          .join("&");
      }
      if (event.body) {
        process.nextTick(() => {
          fakeRequest.emit("data", event.body);
          fakeRequest.emit("end");
        });
      }
    } else if (!isRoutingEvent(event) && isRoutingEvent(config)) {
      fakeRequest.url = config.path;
      fakeRequest.method = config.httpMethod;
    } else if (isUndefined(event.path) && isUndefined(event.httpMethod)) {
      fakeRequest.url = "/";
      fakeRequest.method = "GET";
      logger.warn("No routing provided forwarding to default route", event);
      logger.warn("Use LambdaInterceptor forwarder os set explicit route via LambdaServerConfig");
    }
    let response = new FakeServerResponse();
    try {
      let body = await fireRequest(moduleInjector, fakeRequest, response);
      logger.debug(LAMBDA_EVENT + "_RESPONSE_" + context.awsRequestId, body);
      if (body instanceof Buffer) {
        body = <string>body.toString();
      } else if (isObject(body)) {
        body = JSON.stringify(body);
      }
      if (isGatewayProxyEvent(event)) {
        return callback(null, {
          body: body,
          headers: filterHeaders(response.getHeaders()),
          statusCode: response.getStatusCode(),
          isBase64Encoded: event.isBase64Encoded,
          multiValueHeaders: filterHeaders(response.getHeaders(), true),
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

/**
 * Filter headers
 * @param headers
 * @param multi
 */
function filterHeaders(headers: Object, multi = false) {
  return Reflect.ownKeys(headers)
    .filter(key => !!multi ? Array.isArray(headers[key]) : isString(headers[key]))
    .map(key => {
      return {
        key,
        value: headers[key]
      };
    })
    .reduce((acc, entry) => {
      acc[entry.key] = entry.value;
      return acc;
    }, {});
}

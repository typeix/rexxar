import {IAfterConstruct, Inject, Injectable, Injector, IProvider, verifyProvider} from "@typeix/di";
import {
  isDefined,
  isEqual,
  isFalsy,
  isObject,
  isString,
  isTruthy,
  uuid
} from "@typeix/utils";
import {IResolvedRoute, HttpMethod, Router, RouterError, toHttpMethod} from "@typeix/router"
import {ModuleInjector, Module} from "@typeix/modules";
import {IncomingMessage, OutgoingHttpHeaders, ServerResponse} from "http";
import {EventEmitter} from "events";
import {parse, Url} from "url";
import {IRedirect} from "../interfaces";
import {ControllerResolver} from "./controller";
import {Controller, IControllerMetadata, IModuleMetadata} from "..";
import {BOOTSTRAP_MODULE} from "../decorators/module";
import {LAMBDA_CONTEXT, LAMBDA_EVENT} from "../servers";
import {getClassMetadata} from "@typeix/metadata";
import {Logger} from "@typeix/logger";

/**
 * @since 1.0.0
 * @enum
 * @name Renderer
 * @description
 * RenderType types
 *
 * @private
 */
export enum RenderType {
  REDIRECT,
  DATA_HANDLER,
  CUSTOM_ERROR_HANDLER,
  DEFAULT_ERROR_HANDLER
}


/**
 * @since 1.0.0
 * @interface
 * @name IResolvedModule
 * @param {Object} module
 * @param {Array<Buffer>} data
 * @param {String} controller
 * @param {String} action
 *
 * @description
 * Resolved module data from resolved route
 */
export interface IResolvedModule {
  injector: Injector;
  module: IModule,
  data?: Array<Buffer>;
  resolvedRoute: IResolvedRoute;
  controller: string;
  action: string;
}

/**
 * @since 1.0.0
 * @interface
 * @name IModule
 * @param {Object} token
 * @param {IModuleMetadata} metadata
 *
 * @description
 * Module metadata
 */
export interface IModule {
  token: any;
  metadata: IModuleMetadata;
}

/**
 * @since 1.0.0
 * @function
 * @name fireRequest
 * @param {ModuleInjector} moduleInjector module injector
 * @param {IncomingMessage} request event emitter
 * @param {ServerResponse} response event emitter
 * @return {string|Buffer} data from controller
 *
 * @description
 * Use fireRequest to process request itself, this function is used by http/https server or
 * You can fire fake request
 */
export function fireRequest(moduleInjector: ModuleInjector,
                            request: IncomingMessage,
                            response: ServerResponse): Promise<string | Buffer> {
  let moduleList = <Array<{ token: any, metadata: any }>>moduleInjector.getAllMetadata();
  let rootModuleMetadata = moduleList.find(item => item.metadata.name === BOOTSTRAP_MODULE);
  if (!isDefined(rootModuleMetadata)) {
    return Promise.reject(new RouterError(500, "@RootModule is not defined", rootModuleMetadata))
  }
  let rootInjector: Injector = moduleInjector.getInjector(rootModuleMetadata.token);
  let logger = rootInjector.get(Logger);
  /**
   * Create RequestResolver injector
   */
  let routeResolverInjector = Injector.createAndResolveChild(
    rootInjector,
    RequestResolver,
    [
      {provide: "url", useValue: parse(request.url, true)},
      {provide: "UUID", useValue: uuid()},
      {provide: "data", useValue: []},
      {provide: "contentType", useValue: "text/html"},
      {provide: "statusCode", useValue: 200},
      {provide: "request", useValue: request},
      {provide: "response", useValue: response},
      {provide: ModuleInjector, useValue: moduleInjector},
      {provide: EventEmitter, useValue: new EventEmitter()}
    ]
  );
  /**
   * Get RequestResolver instance
   */
  let rRouteResolver: RequestResolver = routeResolverInjector.get(RequestResolver);

  /**
   * On finish destroy injector
   */
  response.on("finish", () => routeResolverInjector.destroy());

  return rRouteResolver
    .process()
    .catch(error => {
        logger.error("ControllerResolver.error", {
          stack: error.stack,
          url: request.url,
          error
        });
        return error;
      }
    );
}

/**
 * @since 1.0.0
 * @class
 * @name Request
 * @constructor
 * @description
 * Get current request and resolve module and route
 *
 * @private
 */
@Injectable()
export class RequestResolver implements IAfterConstruct {

  /**
   * @param IncomingMessage
   * @description
   * Value provided by injector which handles request input
   */
  @Inject("request")
  private request: IncomingMessage;

  /**
   * @param ServerResponse
   * @description
   * Value provided by injector which handles response output
   */
  @Inject("response")
  private response: ServerResponse;

  /**
   * @param {Injector} injector
   * @description
   * Current injector
   */
  @Inject(Injector)
  private injector: Injector;
  /**
   * @param {Logger} logger
   * @description
   * Provided by injector
   */
  @Inject(Logger)
  private logger: Logger;

  /**
   * @param {Router} router
   * @description
   * Provided by injector
   */
  @Inject(Router)
  private router: Router;

  /**
   * @param {Array<Buffer>} data
   * @description
   * Data received by client on POST, PATCH, PUT requests
   */
  @Inject("data")
  private data: Array<Buffer>;

  /**
   * @param {string} id
   * @description
   * UUID identifier of request
   */
  @Inject("UUID")
  private id: string;

  /**
   * @param {Url} url
   * @description
   * Parsed request url
   */
  @Inject("url")
  private url: Url;

  /**
   * @param {Url} url
   * @description
   * Parsed request url
   */
  @Inject(ModuleInjector)
  private moduleInjector: ModuleInjector;

  /**
   * @param {Number} statusCode
   * @description
   * ControllerResolver status code default 200
   */
  @Inject("statusCode", true)
  private statusCode: number;

  /**
   * @param {String} contentType
   * @description
   * Content type
   */
  @Inject("contentType", true)
  private contentType: String;
  /**
   * @param {EventEmitter} eventEmitter
   * @description
   * Responsible for handling events
   */
  @Inject(EventEmitter)
  private eventEmitter: EventEmitter;

  /**
   * @param {String} redirectTo
   * @description
   * Set redirect to
   */
  private redirectTo: IRedirect;


  /**
   * @since 1.0.0
   * @function
   * @name Request#getControllerProvider
   * @private
   * @description
   * Returns a controller provider
   */
  static getControllerProvider(resolvedModule: IResolvedModule): IProvider {

    let provider: IProvider = verifyProvider(resolvedModule.module.token);
    let moduleMetadata: IModuleMetadata = getClassMetadata(Module, provider.provide)?.args;

    let controllerProvider: IProvider = moduleMetadata.controllers
      .map(item => verifyProvider(item))
      .find((Class: IProvider) => {
        let metadata: IControllerMetadata = getClassMetadata(Controller, Class.provide)?.args;
        return metadata.name === resolvedModule.controller;
      });
    if (!isDefined(controllerProvider)) {
      throw new RouterError(
        400,
        `You must define controller within current route: ${resolvedModule.resolvedRoute.route}`, {
          actionName: resolvedModule.action,
          controllerName: resolvedModule.controller,
          resolvedRoute: resolvedModule.resolvedRoute
        }
      );
    }
    return controllerProvider;
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#afterConstruct
   *
   * @private
   * @description
   * Create events for status code and content type change
   */
  afterConstruct() {
    this.eventEmitter.on("statusCode", value => this.statusCode = value);
    this.eventEmitter.on("contentType", value => this.contentType = value);
    this.eventEmitter.on("redirectTo", value => this.redirectTo = value);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#processError
   * @param {Object} data
   * @param {Boolean} isCustom
   *
   * @private
   * @description
   * Process error handling
   * @todo fix custom error handling
   */
  async processError(data: any, isCustom: boolean): Promise<Buffer | string> {
    // force HttpError to be thrown
    if (!(data instanceof RouterError)) {
      let _error: Error = data;
      data = new RouterError(500, _error.message, {});
      data.stack = _error.stack;
    }
    // log error message
    this.logger.error(data.message, {
      id: this.id,
      method: this.request.method,
      request: this.url,
      url: this.request.url,
      data
    });
    // forward route where error comes from
    if (this.injector.has("resolvedRoute")) {
      data.route = this.injector.get("resolvedRoute");
    }
    // status code is mutable
    this.statusCode = data.getCode();

    if (isTruthy(isCustom) && this.router.hasError()) {

      let route: string;

      if (this.injector.has(Module.toString())) {
        let iResolvedModule: IResolvedModule = this.injector.get(Module.toString());
        route = this.router.getError(iResolvedModule.module.metadata.name);
      } else {
        route = this.router.getError();
      }

      let iResolvedErrorModule = this.getResolvedModule({
        method: HttpMethod.GET,
        params: {},
        route
      });

      if (isTruthy(iResolvedErrorModule)) {
        return await this.processModule(iResolvedErrorModule, data);
      }

    }

    return data.toString();
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#render
   * @param {Buffer|String} response
   * @param {RenderType} type
   *
   * @private
   * @description
   * This method sends data to client
   */
  async render(response: string | Buffer, type: RenderType): Promise<string | Buffer> {

    let headers: OutgoingHttpHeaders = {"Content-Type": <string>this.contentType};

    switch (type) {
      case RenderType.DATA_HANDLER:
        if (isEqual(this.contentType, "application/json") && isObject(response) && !(response instanceof Buffer)) {
          try {
            response = JSON.stringify(response)
          } catch (e) {
            this.logger.error("Cannot convert to json", {
              id: this.id,
              type: typeof response
            });
          }
        }
        if (isString(response) || (response instanceof Buffer) || (this.injector.has(LAMBDA_EVENT) && this.injector.has(LAMBDA_CONTEXT))) {
          this.response.writeHead(this.statusCode, headers);
          this.response.write(response);
          this.response.end();
        } else {
          this.logger.error("Invalid response type", {
            id: this.id,
            response: response,
            type: typeof response
          });
          throw new RouterError(400, "ResponseType must be string or buffer", {
            response
          });
        }
        break;
      case RenderType.CUSTOM_ERROR_HANDLER:
        response = await this.processError(response, true);
        this.response.writeHead(this.statusCode, headers);
        this.response.write(response);
        this.response.end();
        break;
      case RenderType.DEFAULT_ERROR_HANDLER:
        response = await this.processError(response, false);
        this.response.writeHead(this.statusCode, headers);
        this.response.write(response);
        this.response.end();
        break;
      case RenderType.REDIRECT:
        this.response.setHeader("Location", this.redirectTo.url);
        this.response.writeHead(this.redirectTo.code);
        this.response.end();
        break;
      default:
        this.response.writeHead(500);
        this.response.write(`Invalid RenderType provided ${isDefined(response) ? response.toString() : ""}`);
        this.response.end();
        break;
    }

    return response;
  }


  /**
   * @since 1.0.0
   * @function
   * @name Request#processModule
   * @private
   * @description
   * Resolve route and deliver resolved module
   */
  processModule(resolvedModule: IResolvedModule, error?: RouterError): Promise<string | Buffer> {

    let providers = [
      {provide: "data", useValue: this.data},
      {provide: "request", useValue: this.request},
      {provide: "response", useValue: this.response},
      {provide: "url", useValue: this.url},
      {provide: "UUID", useValue: this.id},
      {provide: "controllerProvider", useValue: RequestResolver.getControllerProvider(resolvedModule)},
      {provide: "actionName", useValue: resolvedModule.action},
      {provide: "resolvedRoute", useValue: resolvedModule.resolvedRoute},
      {provide: "isChainStopped", useValue: false},
      {provide: RouterError.toString(), useValue: isTruthy(error) ? error : new RouterError(500, "", {})},
      {provide: EventEmitter, useValue: this.eventEmitter}
    ];
    /**
     * Create and resolve
     */
    let childInjector = Injector.createAndResolveChild(
      resolvedModule.injector,
      ControllerResolver,
      providers
    );
    /**
     * On finish destroy injector
     */
    this.response.on("finish", () => childInjector.destroy());
    /**
     * Get request instance
     * @type {any}
     */
    let pRequest: ControllerResolver = childInjector.get(ControllerResolver);
    /**
     * Process request
     */
    return pRequest.process();
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getResolvedModule
   * @private
   * @description
   * Resolve route and deliver resolved module
   */
  getResolvedModule(resolvedRoute: IResolvedRoute): IResolvedModule {
    let [module, controller, action] = resolvedRoute.route.split("/");
    let iModule: IModule = !isDefined(action) ? this.getModule(BOOTSTRAP_MODULE) : this.getModule(module);
    if (isFalsy(iModule)) {
      throw new RouterError(
        500,
        "Module with route " + resolvedRoute.route + " is not registered in system," +
        " please check your route configuration!",
        resolvedRoute
      );
    }
    return {
      action: !isDefined(action) ? controller : action,
      controller: !isDefined(action) ? module : controller,
      data: this.data,
      module: iModule,
      injector: this.moduleInjector.getInjector(iModule.token),
      resolvedRoute
    };
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#process
   * @private
   * @description
   * Resolve route and deliver resolved module
   */
  process(): Promise<any> {

    // process request
    return this.router
      .parseRequest(this.url.pathname, toHttpMethod(this.request.method), this.request.headers)
      .then((resolvedRoute: IResolvedRoute) => {

        this.logger.debug("Route.parseRequest", {
          method: this.request.method,
          path: this.url.pathname,
          route: resolvedRoute
        });

        /**
         * Copy query params to params if thy are not defined in path
         */
        if (isDefined(this.url.query)) {
          Object.keys(this.url.query).forEach(key => {
            if (!resolvedRoute.params.hasOwnProperty(key)) {
              resolvedRoute.params[key] = this.url.query[key];
            }
          });
        }
        /**
         * ON POST, PATCH, PUT process body
         */
        if ([HttpMethod.POST, HttpMethod.PATCH, HttpMethod.PUT].indexOf(resolvedRoute.method) > -1) {
          this.request.on("data", item => this.data.push(<Buffer>item));
          return new Promise((resolve, reject) => {
            this.request.on("error", reject.bind(this));
            this.request.on("end", resolve.bind(this, resolvedRoute));
          });
        }

        return resolvedRoute;
      })
      .then((resolvedRoute: IResolvedRoute) => {
        let resolvedModule = this.getResolvedModule(resolvedRoute);
        this.injector.set(Module.toString(), resolvedModule);
        this.injector.set("resolvedRoute", resolvedRoute);
        return resolvedModule;
      })
      .then((resolvedModule: IResolvedModule) => this.processModule(resolvedModule))
      .then(data => this.render(data, isFalsy(this.redirectTo) ? RenderType.DATA_HANDLER : RenderType.REDIRECT))
      .catch(data => this.render(data, RenderType.CUSTOM_ERROR_HANDLER))
      .catch(data => this.render(data, RenderType.DEFAULT_ERROR_HANDLER));
  }

  /**
   * Get Module
   * @param {string} name
   * @returns {IModule}
   */
  getModule(name: string): IModule {
    let modules = <Array<{ token: any, metadata: any }>>this.moduleInjector.getAllMetadata();
    return <IModule>modules.find(item => item.metadata.name === name);
  }
}

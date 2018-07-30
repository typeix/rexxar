import {IncomingMessage, ServerResponse} from "http";
import {EventEmitter} from "events";
import {Url} from "url";
import {
  getProviderName,
  IMetadataValue,
  Inject,
  Injectable,
  Injector,
  IProvider,
  verifyProviders,
  IMetadata
} from "@typeix/di";
import {
  isArray,
  isDate,
  isDefined,
  isFalsy,
  isNumber,
  isString,
  isTruthy,
  Logger,
  ServerError,
  StatusCodes
} from "@typeix/utils";
import {fromRestMethod, IResolvedRoute, RestMethods} from "@typeix/router";
import {IConnection} from "../interfaces";
import {ERROR_KEY} from "./request";
import {
  getAllMetadataByDecorator,
  getDecorator,
  getMetadataArgs,
  getMetadataByTargetKey,
  getMetadataValue
} from "../helpers/metadata";
import {IControllerMetadata} from "../decorators";


const TX_PARAMS = "#design:paramtypes";


/**
 * Cookie parse regex
 * @type {RegExp}
 */
const COOKIE_PARSE_REGEX = /(\w+[^=]+)=([^;]+)/g;
const CHAIN_KEY = "__chain__";

/**
 * @since 1.0.0
 * @class
 * @name Request
 * @constructor
 * @description
 * ControllerResolver is responsible for handling router result and processing all requests in system
 * This component is used internally by framework
 *
 * @private
 */
@Injectable()
export class ControllerResolver {

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
   * @param {Array<Buffer>} data
   * @description
   * Data received by client on POST, PATCH, PUT requests
   */
  @Inject("data")
  private data: Array<Buffer>;

  /**
   * @param {Injector} Injector
   * @description
   * Injector which created request
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
   * @param {EventEmitter} eventEmitter
   * @description
   * Responsible for handling events
   */
  @Inject(EventEmitter)
  private eventEmitter: EventEmitter;
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
   * @param {IProvider} controllerProvider
   * @description
   * Injector
   */
  @Inject("controllerProvider")
  private controllerProvider: IProvider;
  /**
   * @param {actionName} actionName:
   * @description
   * Action name
   */
  @Inject("actionName")
  private actionName: string;
  /**
   * @param {boolean} isChainStopped
   * @description
   * When chain is stopped framework will not propagate actions
   */
  @Inject("isChainStopped", true)
  private isChainStopped: boolean;

  /**
   * @param {IResolvedRoute} resolvedRoute
   * @description
   * Resolved route from injector
   */
  @Inject("resolvedRoute")
  private resolvedRoute: IResolvedRoute;

  /**
   * @since 1.0.0
   * @function
   * @name Request#isControllerPrototypeOf
   * @private
   * @description
   * Validate controller inheritance
   */
  static isControllerInherited(a: Function, b: Function) {
    return b.isPrototypeOf(a.prototype) || Object.is(a.prototype, b);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#stopChain
   * @private
   * @description
   * Stop action chain
   */
  stopChain() {
    this.isChainStopped = true;
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#destroy
   * @private
   * @description
   * Destroy all references to free memory
   */
  destroy() {
    this.eventEmitter.emit("destroy");
    this.eventEmitter.removeAllListeners();
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getEventEmitter
   * @private
   *
   * @description
   * Get request event emitter
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getIncomingMessage
   * @private
   *
   * @description
   * Get IncomingMessage object
   */
  getIncomingMessage(): IncomingMessage {
    return this.request;
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getServerResponse
   * @private
   *
   * @description
   * Get ServerResponse object
   */
  getServerResponse(): ServerResponse {
    return this.response;
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getBody
   * @private
   *
   * @description
   * Get request body if present only on POST, PUT, PATCH
   */
  getBody(): Buffer {
    return Buffer.concat(this.data);
  }


  /**
   * @since 1.0.0
   * @function
   * @name Request#getUUID
   * @private
   *
   * @description
   * Return uuid created with this request
   */
  getUUID(): string {
    return this.id;
  }


  /**
   * @since 1.0.0
   * @function
   * @name Request#process
   * @private
   * @description
   * Process request logic
   */
  process(): Promise<string | Buffer> {

    // destroy on end
    this.response.once("finish", () => this.destroy());
    // destroy if connection was terminated before end
    this.response.once("close", () => this.destroy());

    // set request reflection
    let reflectionInjector = Injector.createAndResolveChild(this.injector, Request, [
      {provide: ControllerResolver, useValue: this}
    ]);

    return this.processController(reflectionInjector, this.controllerProvider, this.actionName);
  }


  /**
   * @since 1.0.0
   * @function
   * @name Request#hasMappedAction
   * @private
   * @description
   * Check if controller has mapped action
   */
  hasMappedAction(controllerProvider: IProvider, actionName: String, name: string = "Action"): boolean {
    return isDefined(
      getAllMetadataByDecorator(controllerProvider.provide.prototype, name)
        .find(item => item.metadataValue.args.value === actionName)
    );
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getMappedAction
   * @private
   * @description
   * Returns a mapped action metadata
   */
  getMappedAction(controllerProvider: IProvider, actionName: String, name: string = "Action"): IMetadata {
    // get mappings from controller
    let mappedAction = getAllMetadataByDecorator(controllerProvider.provide.prototype, name)
      .find(item => item.metadataValue.args.value === actionName);
    // check if action is present
    if (!isDefined(mappedAction)) {
      throw new ServerError(
        StatusCodes.Bad_Request,
        `@${name}("${actionName}") is not defined on controller ${getProviderName(controllerProvider.provide)}`,
        {
          actionName,
          name,
          resolvedRoute: this.resolvedRoute
        }
      );
    }

    return mappedAction;
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getDecoratorByMappedAction
   * @private
   * @description
   * Get param decorator by mapped action
   */
  getDecoratorByMappedAction(controllerProvider: IProvider, mappedAction: IMetadata, paramName: string): IMetadataValue {

    return getMetadataValue(
      controllerProvider.provide.prototype,
      paramName,
      mappedAction.targetKey
    );
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getMappedActionArguments
   * @private
   * @description
   * Get list of action arguments
   */
  getMappedActionArguments(controllerProvider: IProvider, mappedAction: IMetadata): Array<IMetadataValue> {
    // get mappings from controller
    let metadataList = getMetadataByTargetKey(
      controllerProvider.provide.prototype,
      mappedAction.targetKey
    );
    let paramTypes: Array<any> = metadataList.find(item => item.metadataKey == getDecorator(TX_PARAMS)).metadataValue;
    return paramTypes.map((item, index) => {
      let paramByIndex = metadataList.find(cItem => isDefined(cItem.metadataValue) ? cItem.metadataValue.paramIndex === index : false);
      if (isDefined(paramByIndex)) {
        return paramByIndex.metadataValue;
      }
      return {
        name: "typeix:@Inject",
        key: mappedAction.targetKey,
        args: {
          isMutable: false,
          value: item
        },
        paramIndex: index
      }
    });
  }


  /**
   * @since 1.0.0
   * @function
   * @name Request#processAction
   * @private
   * @description
   * Process mapped action
   */
  processAction(injector: Injector,
                controllerProvider: IProvider,
                mappedAction: IMetadata): string | Buffer {
    // get controller instance
    let controllerInstance = injector.get(controllerProvider.provide);
    // get action
    let action = controllerInstance[mappedAction.targetKey].bind(controllerInstance);
    // content type
    let contentType: IMetadataValue = this.getDecoratorByMappedAction(controllerProvider, mappedAction, "Produces");

    if (isDefined(contentType)) {
      this.getEventEmitter().emit("contentType", contentType.args.value);
    }
    // resolve action params
    let actionParams = [];
    let params: Array<IMetadataValue> = this.getMappedActionArguments(controllerProvider, mappedAction);

    if (isDefined(params)) {
      // make sure params are sorted correctly :)
      params.sort((a, b) => {
        if (a.paramIndex > b.paramIndex) {
          return 1;
        } else if (a.paramIndex < b.paramIndex) {
          return -1;
        }
        return 0;
      });
      // push action params
      params.forEach(param => {
        switch (param.name) {
          case "typeix:rexxar:@Param":
            if (isDefined(this.resolvedRoute.params) && this.resolvedRoute.params.hasOwnProperty(param.args.value)) {
              actionParams.push(this.resolvedRoute.params[param.args.value]);
            } else {
              actionParams.push(null);
            }
            break;
          case "typeix:rexxar:@Chain":
            actionParams.push(injector.get(CHAIN_KEY));
            break;
          case "typeix:@Inject":
            actionParams.push(injector.get(param.args.value));
            break;
          case "typeix:rexxar:@ErrorMessage":
            actionParams.push(injector.get(ERROR_KEY));
            break;
        }
      });
    }

    return action.apply(controllerInstance, actionParams);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#processControllerFilters
   * @private
   * @description
   * Process controller filters
   */
  async processFilters(injector: Injector,
                       metadata: IControllerMetadata,
                       isAfter: boolean): Promise<any> {

    let filters = verifyProviders(metadata.filters).filter(item => {
      let filterMetadata = getMetadataArgs(item.provide, "Filter");
      if (isDefined(filterMetadata)) {
        return (
          filterMetadata.route === "*" ||
          filterMetadata.route === this.resolvedRoute.route ||
          filterMetadata.route === (metadata.name + "/*")
        );
      }
      return false;
    })
      .sort((aItem, bItem) => {
        let a: any = getMetadataArgs(aItem.provide, "Filter");
        let b: any = getMetadataArgs(bItem.provide, "Filter");
        if (a.priority > b.priority) {
          return -1;
        } else if (a.priority < b.priority) {
          return 1;
        }
        return 0;
      });

    for (let provider of filters) {
      let filterInjector = Injector.createAndResolveChild(injector, provider, []);
      let filter = filterInjector.get(provider.provide);

      if (isFalsy(this.isChainStopped)) {
        if (!isAfter) {
          let start = Date.now();
          let result = await filter.before(injector.get(CHAIN_KEY));
          injector.set(CHAIN_KEY, result);
          this.benchmark(`Filter.before: ${getProviderName(filter, "on filter ")}`, start);
        } else {
          let start = Date.now();
          let result = await filter.after(injector.get(CHAIN_KEY));
          injector.set(CHAIN_KEY, result);
          this.benchmark(`Filter.after: ${getProviderName(filter, "on filter ")}`, start);
        }
      }

      filterInjector.destroy();
    }

    return await injector.get(CHAIN_KEY);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#processController
   * @private
   * @description
   * Handle controller instance
   */
  async processController(reflectionInjector: Injector,
                          controllerProvider: IProvider,
                          actionName: String): Promise<any> {
    // get controller metadata
    let metadata = getMetadataArgs(controllerProvider.provide, "Controller");
    let providers: Array<IProvider> = verifyProviders(metadata.providers);
    // limit controller api
    let limitApi = ["request", "response", "controllerProvider", "modules"];
    limitApi.forEach(item => providers.push({provide: item, useValue: {}}));
    // benchmark
    let requestStart = Date.now();
    // create controller injector
    let injector = new Injector(reflectionInjector, [CHAIN_KEY]);

    // initialize controller
    injector.createAndResolve(
      controllerProvider,
      verifyProviders(providers)
    );

    // set default chain key
    injector.set(CHAIN_KEY, null);

    // process filters
    if (isArray(metadata.filters)) {
      // set filter result
      injector.set(CHAIN_KEY, await this.processFilters(injector, metadata, false));
    }

    // process @BeforeEach action
    if (this.hasMappedAction(controllerProvider, null, "BeforeEach") && isFalsy(this.isChainStopped)) {
      let start = Date.now();
      let result = await this.processAction(
        injector,
        controllerProvider,
        this.getMappedAction(controllerProvider, null, "BeforeEach")
      );

      injector.set(CHAIN_KEY, result);
      this.benchmark("BeforeEach", start);
    }

    // process @Before action
    if (this.hasMappedAction(controllerProvider, actionName, "Before") && isFalsy(this.isChainStopped)) {
      let start = Date.now();
      let result = await this.processAction(
        injector,
        controllerProvider,
        this.getMappedAction(controllerProvider, actionName, "Before")
      );
      injector.set(CHAIN_KEY, result);
      this.benchmark("Before", start);
    }

    // Action
    if (isFalsy(this.isChainStopped)) {
      let start = Date.now();
      let result = await this.processAction(
        injector,
        controllerProvider,
        this.getMappedAction(controllerProvider, actionName)
      );
      injector.set(CHAIN_KEY, result);
      this.benchmark("Action", start);
    }

    // process @After action
    if (this.hasMappedAction(controllerProvider, actionName, "After") && isFalsy(this.isChainStopped)) {
      let start = Date.now();
      let result = await this.processAction(
        injector,
        controllerProvider,
        this.getMappedAction(controllerProvider, actionName, "After")
      );
      injector.set(CHAIN_KEY, result);
      this.benchmark("After", start);
    }

    // process @AfterEach action
    if (this.hasMappedAction(controllerProvider, null, "AfterEach") && isFalsy(this.isChainStopped)) {
      let start = Date.now();
      let result = await this.processAction(
        injector,
        controllerProvider,
        this.getMappedAction(controllerProvider, null, "AfterEach")
      );
      injector.set(CHAIN_KEY, result);
      this.benchmark("AfterEach", start);
    }

    if (isFalsy(this.isChainStopped) && isArray(metadata.filters)) {
      // set filter result
      injector.set(CHAIN_KEY, await this.processFilters(injector, metadata, true));
    }

    this.benchmark("Request", requestStart);

    // render action call
    return await injector.get(CHAIN_KEY);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#benchmark
   * @private
   * @description
   * Print benchmark
   */
  private benchmark(message: string, start: number) {
    this.logger.benchmark(`${message}: ${(Date.now() - start)}ms`, {
      method: fromRestMethod(this.resolvedRoute.method),
      route: this.resolvedRoute.route,
      url: this.request.url
    });
  }
}

/**
 * @since 1.0.0
 * @class
 * @name Request
 * @constructor
 * @description
 * Get request reflection to limit public api
 *
 * @private
 */
@Injectable()
export class Request {

  /**
   * @param ControllerResolver
   * @description
   * Current internal ControllerResolver instance
   */
  @Inject(ControllerResolver)
  private controllerResolver: ControllerResolver;

  /**
   * @param ResolvedRoute
   * @description
   * Current internal resolved route
   */
  @Inject("resolvedRoute")
  private resolvedRoute: IResolvedRoute;
  /**
   * @param cookies
   * @description
   * Cookies object are stored to this object first time thy are parsed
   */
  private cookies: { [key: string]: string };

  /**
   * @since 1.0.0
   * @function
   * @name Request#onDestroy
   *
   * @description
   * Add destroy event to public api
   */
  onDestroy(callback: (...args: any[]) => void): void {
    this.controllerResolver.getEventEmitter().once("destroy", callback);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getConnection
   *
   * @description
   * Get connection data
   */
  getConnection(): IConnection {
    let request = this.controllerResolver.getIncomingMessage();
    return {
      uuid: this.controllerResolver.getUUID(),
      method: request.method,
      url: request.url,
      httpVersion: request.httpVersion,
      httpVersionMajor: request.httpVersionMajor,
      httpVersionMinor: request.httpVersionMinor,
      remoteAddress: request.connection.remoteAddress,
      remoteFamily: request.connection.remoteFamily,
      remotePort: request.connection.remotePort,
      localAddress: request.connection.localAddress,
      localPort: request.connection.localPort
    };
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getCookies
   *
   * @description
   * Return parsed cookies
   */
  getCookies(): { [key: string]: string } {

    if (isDefined(this.cookies)) {
      return this.cookies;
    }
    // get cookie string
    let cookie: string = this.getRequestHeader("Cookie");

    if (isDefined(cookie)) {

      this.cookies = {};

      // parse cookies
      cookie.match(COOKIE_PARSE_REGEX)
        .map(item => item.split(COOKIE_PARSE_REGEX).slice(1, -1))
        .map(item => {
          return {
            key: item.shift(),
            value: item.shift()
          };
        })
        .forEach(item => {
          this.cookies[item.key] = item.value;
        });

      return this.cookies;
    }

    return {};
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getCookie
   *
   * @description
   * Return request headers
   */
  getCookie(name: string): string {
    let cookies = this.getCookies();
    return cookies[name];
  }

  /**
   * @since 0.0.1
   * @function
   * @name Request#setResponseCookie
   * @param {String} key cookie name
   * @param {String} value cookie value
   * @param {String|Object|Number} expires expire date
   * @param {String} path cookie path
   * @param {String} domain cookie domain
   * @param {Boolean} isHttpOnly is http only
   * @description
   * Sets an cookie header
   */
  setCookie(key: string, value: string, expires?: number | Date | string, path?: string, domain?: string, isHttpOnly?: boolean) {

    let cookie = key + "=" + value;

    if (isDefined(expires) && isNumber(expires)) {
      let date: Date = new Date();
      date.setTime(date.getTime() + (<number> expires));
      cookie += "; Expires=";
      cookie += date.toUTCString();
    } else if (isDefined(expires) && isString(expires)) {
      cookie += "; Expires=" + expires;
    } else if (isDefined(expires) && isDate(expires)) {
      cookie += "; Expires=";
      cookie += (<Date> expires).toUTCString();
    }

    if (isDefined(path)) {
      cookie += "; Path=" + path;
    }
    if (isDefined(domain)) {
      cookie += "; Domain=" + domain;
    }
    if (isTruthy(isHttpOnly)) {
      cookie += "; HttpOnly";
    }

    this.setResponseHeader("Set-cookie", cookie);

  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getRequestHeaders
   *
   * @description
   * Return request headers
   */
  getRequestHeaders(): any {
    return this.controllerResolver.getIncomingMessage().headers;
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getRequestHeader
   *
   * @description
   * Return request header by name
   */
  getRequestHeader(name: string): any {
    let requestHeaders = this.getRequestHeaders();
    let headers = isDefined(requestHeaders) ? requestHeaders : {};
    return headers[name.toLocaleLowerCase()];
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#setResponseHeader
   * @param {String} name
   * @param {String} value
   *
   * @description
   * Set response header
   */
  setResponseHeader(name: string, value: string | string[]): void {
    this.controllerResolver.getServerResponse().setHeader(name, value);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#setContentType
   * @param {String} value
   *
   * @description
   * Set response content type
   */
  setContentType(value: string) {
    this.controllerResolver.getEventEmitter().emit("contentType", value);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getParams
   *
   * @description
   * Get all request parameters
   */
  getParams(): Object {
    return isDefined(this.resolvedRoute.params) ? this.resolvedRoute.params : {};
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getParam
   * @param {string} name
   *
   * @description
   * Get resolve route param
   */
  getParam(name: string): string {
    let params = this.getParams();
    return params[name];
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getMethod
   *
   * @description
   * Return resolved route method
   */
  getMethod(): RestMethods {
    return this.resolvedRoute.method;
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getRoute
   *
   * @description
   * Return resolved route name
   */
  getRoute(): string {
    return this.resolvedRoute.route;
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#getBody
   *
   * @description
   * Get request body buffer
   */
  getBody(): Buffer {
    return this.controllerResolver.getBody();
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#setStatusCode
   *
   * @description
   * Set status code
   */
  setStatusCode(code: StatusCodes | number) {
    this.controllerResolver.getEventEmitter().emit("statusCode", code);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#stopChain
   *
   * @description
   * Stops action chain
   */
  stopChain() {
    this.controllerResolver.stopChain();
  }

  /**
   * @since 1.0.0
   * @function
   * @name Request#redirectTo
   *
   * @description
   * Stops action chain
   */
  redirectTo(url: string, code: StatusCodes | number) {
    this.stopChain();
    this.controllerResolver.getEventEmitter().emit("redirectTo", {
      code, url
    });
  }
}

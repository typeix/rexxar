import {Readable, Writable} from "stream";
import {Socket} from "net";
import {EventEmitter} from "events";
import {IncomingMessage, ServerResponse} from "http";
import {isArray, isObject, Logger, ServerError, uuid} from "@typeix/utils";
import {Inject, Injector, IProvider, verifyProvider} from "@typeix/di";
import {ModuleInjector} from "@typeix/modules";
import {ControllerResolver} from "../resolvers/controller";
import {ERROR_KEY, fireRequest} from "../resolvers/request";
import {IResolvedRoute, RestMethods} from "@typeix/router";
import {getMetadataArgs} from "./metadata";
import {IControllerMetadata} from "../decorators";
import {BOOTSTRAP_MODULE, RootModuleMetadata} from "../decorators/module";


export interface IFakeServerConfig {
}

/**
 * @since 1.0.0
 * @function
 * @name fakeHttpServer
 * @param {Function} Class httpServer class
 * @param {IFakeServerConfig} config fakeHttpServer config
 * @returns {Injector}
 *
 * @description
 * Use fakeHttpServer for testing only
 */

export function fakeHttpServer(Class: Function, config?: IFakeServerConfig): FakeServerApi {
  let metadata: RootModuleMetadata = getMetadataArgs(Class, "#typeix:@Module");
  if (metadata.name != BOOTSTRAP_MODULE) {
    throw new ServerError(500, "fakeHttpServer must be initialized on @RootModule")
  }
  let moduleInjector = ModuleInjector.createAndResolve(Class, isArray(metadata.shared_providers) ? metadata.shared_providers : []);
  let fakeServerInjector = Injector.createAndResolve(FakeServerApi, [
    {provide: ModuleInjector, useValue: moduleInjector}
  ]);
  return fakeServerInjector.get(FakeServerApi);
}
/**
 * @since 1.0.0
 * @function
 * @name fakeControllerActionCall
 * @param {Injector} injector
 * @param {Function | IProvider} controller
 * @param {String} action name to fire action
 * @param {Object} params
 * @param {Object} headers
 *
 * @returns {Promise<string|Buffer>}
 *
 * @description
 * Use fakeControllerCall for testing only
 */
export function fakeControllerActionCall(injector: Injector,
                                         controller: Function | IProvider,
                                         action: string,
                                         params?: Object,
                                         headers?: Object): Promise<string | Buffer> {
  let request = new FakeIncomingMessage();
  request.method = "GET";
  request.headers = isObject(headers) ? headers : {};
  request.url = "/";
  let response = new FakeServerResponse();
  let controllerProvider: IProvider = verifyProvider(controller);
  let metadata: IControllerMetadata = getMetadataArgs(controllerProvider.provide, "Controller");
  let route: IResolvedRoute = {
    method: RestMethods.GET,
    params: isObject(params) ? params : {},
    route: metadata.name + "/" + action
  };
  let providers: Array<IProvider> = [
    {provide: "data", useValue: []},
    {provide: "request", useValue: request},
    {provide: "response", useValue: response},
    {provide: "url", useValue: request.url},
    {provide: "UUID", useValue: uuid()},
    {provide: "controllerProvider", useValue: controllerProvider},
    {provide: "actionName", useValue: action},
    {provide: "resolvedRoute", useValue: route},
    {provide: "isForwarded", useValue: false},
    {provide: "isForwarder", useValue: false},
    {provide: "isChainStopped", useValue: false},
    {provide: ERROR_KEY, useValue: new ServerError(500)},
    {provide: EventEmitter, useValue: new EventEmitter()}
  ];
  // if there is no logger provide it
  if (!injector.has(Logger)) {
    providers.push(verifyProvider(Logger));
  }
  /**
   * Create and resolve
   */
  let childInjector = Injector.createAndResolveChild(
    injector,
    ControllerResolver,
    providers
  );
  /**
   * On finish destroy injector
   */
  response.on("finish", () => childInjector.destroy());
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
 * @class
 * @name FakeResponseApi
 * @constructor
 * @description
 * FakeResponseApi api
 *
 * @private
 */
export interface FakeResponseApi {
  getStatusCode(): number;

  getBody(): string | Buffer;

  getHeaders(): any;
}

/**
 * @since 1.0.0
 * @class
 * @name FakeServerApi
 * @constructor
 * @description
 * Get a FakeServerApi to do serverside requests
 *
 * @private
 */
export class FakeServerApi {

  @Inject(ModuleInjector)
  private moduleInjector: ModuleInjector;

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#getModuleInjector
   * @description
   * Get initialized modules
   */
  getModuleInjector(): ModuleInjector {
    return this.moduleInjector;
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#GET
   * @description
   * Fire GET Method
   */
  GET(url: string, headers?: Object): Promise<FakeResponseApi> {
    let request = new FakeIncomingMessage();
    request.method = "GET";
    request.url = url;
    request.headers = headers;
    return this.request(request, new FakeServerResponse());
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#OPTIONS
   * @description
   * Fire OPTIONS Method
   */
  OPTIONS(url: string, headers?: Object): Promise<FakeResponseApi> {
    let request = new FakeIncomingMessage();
    request.method = "OPTIONS";
    request.url = url;
    request.headers = headers;
    return this.request(request, new FakeServerResponse());
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#HEAD
   * @description
   * Fire HEAD Method
   */
  HEAD(url: string, headers?: Object): Promise<FakeResponseApi> {
    let request = new FakeIncomingMessage();
    request.method = "HEAD";
    request.url = url;
    request.headers = headers;
    return this.request(request, new FakeServerResponse());
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#DELETE
   * @description
   * Fire DELETE Method
   */
  DELETE(url: string, headers?: Object): Promise<FakeResponseApi> {
    let request = new FakeIncomingMessage();
    request.method = "DELETE";
    request.url = url;
    request.headers = headers;
    return this.request(request, new FakeServerResponse());
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#TRACE
   * @description
   * Fire TRACE Method
   */
  TRACE(url: string, headers?: Object): Promise<FakeResponseApi> {
    let request = new FakeIncomingMessage();
    request.method = "TRACE";
    request.url = url;
    request.headers = headers;
    return this.request(request, new FakeServerResponse());
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#CONNECT
   * @description
   * Fire CONNECT Method
   */
  CONNECT(url: string, headers?: Object): Promise<FakeResponseApi> {
    let request = new FakeIncomingMessage();
    request.method = "CONNECT";
    request.url = url;
    request.headers = headers;
    return this.request(request, new FakeServerResponse());
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#POST
   * @description
   * Fire POST Method
   */
  POST(url: string, data?: string | Buffer, headers?: Object): Promise<FakeResponseApi> {
    let request = new FakeIncomingMessage();
    request.method = "POST";
    request.url = url;
    request.headers = headers;
    // simulate async event
    process.nextTick(() => {
      request.emit("data", data);
      request.emit("end");
    });
    return this.request(request, new FakeServerResponse());
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#PUT
   * @description
   * Fire PUT Method
   */
  PUT(url: string, data?: string | Buffer, headers?: Object): Promise<FakeResponseApi> {
    let request = new FakeIncomingMessage();
    request.method = "PUT";
    request.url = url;
    request.headers = headers;
    // simulate async event
    process.nextTick(() => {
      request.emit("data", data);
      request.emit("end");
    });
    return this.request(request, new FakeServerResponse());
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#PATCH
   * @description
   * Fire PATCH Method
   */
  PATCH(url: string, data?: string | Buffer, headers?: Object): Promise<FakeResponseApi> {
    let request = new FakeIncomingMessage();
    request.method = "PATCH";
    request.url = url;
    request.headers = headers;
    // simulate async event
    process.nextTick(() => {
      request.emit("data", data);
      request.emit("end");
    });
    return this.request(request, new FakeServerResponse());
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerApi#request
   * @private
   * @description
   * Fire request
   */
  private request(request: FakeIncomingMessage, response: FakeServerResponse): Promise<FakeResponseApi> {
    return fireRequest(this.getModuleInjector(), request, response).then(() => {
      return {
        getBody: () => response.getBody(),
        getHeaders: () => response.getHeaders(),
        getStatusCode: () => response.statusCode
      };
    });
  }
}


/**
 * @since 1.0.0
 * @class
 * @name FakeIncomingMessage
 * @constructor
 * @description
 * FakeIncomingMessage is used by FakeServerApi
 * Simulates socket api
 *
 * @private
 */
export class FakeIncomingMessage extends Readable implements IncomingMessage {
  httpVersion: string = "1.1";
  httpVersionMajor: number = 1;
  httpVersionMinor: number = 1;
  connection: Socket;
  headers: any;
  rawHeaders: string[];
  trailers: any;
  rawTrailers: any;
  method?: string;
  url?: string;
  statusCode?: number;
  statusMessage?: string;
  socket: Socket;
  aborted: boolean;
  complete: boolean;

  _read(size: number): void {
    console.log("_read");
  }

  setTimeout(msecs: number, callback: () => void): this {
    setTimeout(callback, msecs);
    return this;
  }

  destroy(error?: Error) {
    console.log(error);
    console.log("destroy");
  }


}


/**
 * @since 1.0.0
 * @class
 * @name FakeServerResponse
 * @constructor
 * @description
 * FakeServerResponse is used by FakeServerApi
 * Simulates socket api
 *
 * @private
 */
export class FakeServerResponse extends Writable implements ServerResponse {
  upgrading: boolean;
  chunkedEncoding: boolean;
  shouldKeepAlive: boolean;
  useChunkedEncodingByDefault: boolean;
  connection: Socket;
  statusCode: number = 200;
  headers: any = {};
  statusMessage: string;
  headersSent: boolean = false;
  sendDate: boolean;
  message: string | Buffer;
  finished: boolean = false;

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#writeContinue
   * @private
   * @description
   * Write continue chunk
   */
  writeContinue() {
    console.log("writeContinue");
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#addTrailers
   * @private
   * @description
   * Add Header Trailers
   */
  addTrailers(headers: any) {
    console.log(headers);
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#end
   * @private
   * @description
   * End request
   */
  end() {
    this.emit("finish");
    this.headersSent = true;
    this.finished = true;
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#writeHead
   * @private
   * @description
   * Write head
   */
  writeHead(statusCode: number, headers?: any): this {
    this.statusCode = statusCode;
    if (isObject(headers)) {
      Object.assign(this.headers, headers);
    }
    this.headersSent = true;
    return this
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#setHeader
   * @private
   * @description
   * Set response header
   */
  setHeader(name: string, value: string | string[]) {
    this.headers[name] = value;
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#getHeader
   * @private
   * @description
   * Get response header
   */
  getHeader(name: string): string {
    if (this.hasHeader(name)) {
      return this.headers[name];
    }
    return null;
  }


  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#hasHeader
   * @private
   * @description
   * Has header
   */
  hasHeader(name: string): boolean {
    return this.headers.hasOwnProperty(name);
  }


  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#getHeaderNames
   * @private
   * @description
   * Get header names
   */
  getHeaderNames(): string[] {
    return Object.keys(this.headers);
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#removeHeader
   * @private
   * @description
   * Remove response header
   */
  removeHeader(name: string) {
    if (this.headers.hasOwnProperty(name)) {
      delete this.headers[name];
    }
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#getHeaders
   * @private
   * @description
   * Get headers
   */
  getHeaders(): { [key: string]: string | string[] } {
    return this.headers;
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#getBody
   * @private
   * @description
   * Get writed body
   */
  getBody(): string | Buffer {
    return this.message;
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#getBody
   * @private
   * @description
   * Get writed body
   */
  getStatusCode(): number {
    return this.statusCode;
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#write
   * @private
   * @description
   * Write data
   */
  write(value: Buffer | string,
        encoding?: string | Function,
        cb?: Function | string): boolean {
    this.message = value;
    return false;
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#assignSocket
   * @private
   * @description
   * assign socket
   */
  assignSocket(socket: Socket): void {
    console.log("assignSocket");
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#detachSocket
   * @private
   * @description
   * detach socket
   */
  detachSocket(socket: Socket): void {
    console.log("assignSocket");
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#setTimeout
   * @private
   * @description
   * set timeout
   */
  setTimeout(msecs: number, callback?: () => void): this {
    setTimeout(callback, msecs);
    return this;
  }

  /**
   * @since 1.0.0
   * @function
   * @name FakeServerResponse#flushHeaders
   * @private
   * @description
   * flush headers
   */
  flushHeaders(): void {
    console.log("flushHeaders");
  }

  /**
   * @since 2.1.0
   * @function
   * @name FakeServerResponse#writeProcessing
   * @private
   * @description
   * flush headers
   */
  writeProcessing(): void {
    console.log("writeProcessing");
  }


}

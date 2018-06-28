import {IProvider} from "@typeix/di";
import {StatusCodes} from "@typeix/utils";


/**
 * @since 1.0.0
 * @interface
 * @name IFilter
 *
 * @description
 * Filter for controller before and after processing
 */
export interface IFilter {
  before(data: string | Buffer): string | Buffer | Promise<string | Buffer>;
  after(data: string | Buffer): string | Buffer | Promise<string | Buffer>;
}

/**
 * @since 1.0.0
 * @interface
 * @name IControllerMetadata
 *
 * @description
 * ControllerResolver metadata
 */
export interface IControllerMetadata {
  name: string;
  filters?: Array<TFilter>;
  providers?: Array<IProvider|Function>;
}
/**
 * @since 1.0.0
 * @interface
 * @name IFilter
 *
 * @description
 * Filter for controller before and after processing
 */
export interface TFilter {
  new (): IFilter;
}
/**
 * @since 1.0.0
 * @interface
 * @name IConnection
 * @param {String} method
 * @param {String} url
 * @param {String} httpVersion
 * @param {Number} httpVersionMajor
 * @param {Number} httpVersionMinor
 * @param {String} remoteAddress
 * @param {String} remoteFamily
 * @param {Number} remotePort
 * @param {String} localAddress
 * @param {Number} localPort
 *
 * @description
 * Current connection data
 */
export interface IConnection {
  uuid: string;
  method: string;
  url: string;
  httpVersion: string;
  httpVersionMajor: number;
  httpVersionMinor: number;
  remoteAddress: string;
  remoteFamily: string;
  remotePort: number;
  localAddress: string;
  localPort: number;
}
/**
 * @since 1.0.0
 * @interface
 * @name Redirect
 * @description
 * Status enums
 */
export interface IRedirect {
  url: string;
  code: StatusCodes;
}

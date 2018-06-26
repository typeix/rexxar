import {defineMetadata, IMetadataValue} from "@typeix/di";
import {isObject} from "@typeix/utils";

/**
 * Action mapping
 * @param type
 * @param value
 * @returns {(Class: Function, key: (string | symbol), descriptor: PropertyDescriptor) => any}
 */
let map = (type, value?: any) => {
  return (Class: Function, key: string | symbol, descriptor: PropertyDescriptor): any => {
    let METADATA_KEY = "typeix:mvc:action:@" + type;
    let metadata: IMetadataValue = {
      args: {
        type,
        value
      },
      key,
      name: METADATA_KEY
    };
    defineMetadata(METADATA_KEY, metadata, Class, key);
    if (isObject(descriptor)) {
      descriptor.configurable = false;
      descriptor.writable = false;
    }
    return Class;
  };
};

/**
 * Action decorator
 * @decorator
 * @function
 * @name BeforeEach
 *
 * @description
 * Before each action
 */
export let BeforeEach = (): MethodDecorator => {
  return map("BeforeEach", null);
};

/**
 * Action decorator
 * @decorator
 * @function
 * @name AfterEach
 *
 * @description
 * After each action
 */
export let AfterEach = (): MethodDecorator => {
  return map("AfterEach", null);
};
/**
 * Action decorator
 * @decorator
 * @function
 * @name Action
 *
 * @param {String} value
 *
 * @description
 * Define name of action to class
 */
export let Action = (value: string): MethodDecorator => {
  return map("Action", value);
};
/**
 * Before Action decorator
 * @decorator
 * @function
 * @name Before
 *
 * @param {String} value
 *
 * @description
 * Define name of before action to class
 */
export let Before = (value: string): MethodDecorator => {
  return map("Before", value);
};
/**
 * After Action decorator
 * @decorator
 * @function
 * @name After
 *
 * @param {String} value
 *
 * @description
 * Define name of after action to class
 */
export let After = (value: string): MethodDecorator => {
  return map("After", value);
};

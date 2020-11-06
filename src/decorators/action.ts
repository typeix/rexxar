import {createMethodDecorator} from "@typeix/metadata";

/**
 * Action decorator
 * @decorator
 * @function
 * @name BeforeEach
 *
 * @description
 * Before each action
 */

export function BeforeEach() {
  return createMethodDecorator(BeforeEach, {value: null});
}

/**
 * Action decorator
 * @decorator
 * @function
 * @name AfterEach
 *
 * @description
 * After each action
 */
export function AfterEach() {
  return createMethodDecorator(AfterEach, {value: null});
}
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
export function Action(value: string) {
  return createMethodDecorator(Action, {value});
}
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
export function Before(value: string) {
  return createMethodDecorator(Before, {value});
}
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
export function After(value: string) {
  return createMethodDecorator(After, {value});
}

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
  return createMethodDecorator(BeforeEach);
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
  return createMethodDecorator(AfterEach);
}
/**
 * Action decorator
 * @decorator
 * @function
 * @name Action
 *
 * @param {String} name
 *
 * @description
 * Define name of action to class
 */
export function Action(name: string) {
  return createMethodDecorator(Action, {name});
}
/**
 * Before Action decorator
 * @decorator
 * @function
 * @name Before
 *
 * @param {String} name
 *
 * @description
 * Define name of before action to class
 */
export function Before(name: string) {
  return createMethodDecorator(Action, {name});
}
/**
 * After Action decorator
 * @decorator
 * @function
 * @name After
 *
 * @param {String} name
 *
 * @description
 * Define name of after action to class
 */
export function After(name: string) {
  return createMethodDecorator(Action, {name});
}

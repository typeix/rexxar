import {Inject} from "@typeix/di";
import {LAMBDA_EVENT} from "../servers";

/**
 * Lambda event
 * @decorator
 * @function
 * @name LambdaEvent
 *
 * @description
 * Inject lambda event in your request
 */
export let LambdaEvent = Inject(LAMBDA_EVENT, false);

import {IResolvedRoute, HttpMethod} from "@typeix/router";
import {ControllerResolver, Request} from "./controller";
import {uuid} from "@typeix/utils";
import {EventEmitter} from "events";
import {Inject, Injector, verifyProvider, verifyProviders} from "@typeix/di";
import {
  Action,
  After,
  Before,
  AfterEach,
  BeforeEach,
  Chain,
  Controller,
  ErrorMessage,
  Filter,
  IFilter,
  Param,
  Produces, LOGGER
} from "..";
import {fakeControllerActionCall} from "../helpers/mocks";
import {BOOTSTRAP_MODULE} from "../decorators/module";
import * as log4js from "log4js";
import {getClassMetadata, IMetadata} from "@typeix/metadata";


describe("ControllerResolver", () => {


  let resolvedRoute: IResolvedRoute;
  let eventEmitter;
  let controllerResolver: ControllerResolver;
  let controllerProvider, IRequest, request, response, data, id = uuid(), url = "/";
  let actionName = "action";

  beforeEach(() => {
    resolvedRoute = {
      method: HttpMethod.GET,
      params: {
        a: 1,
        b: 2
      },
      route: "core/index"
    };
    response = new EventEmitter();
    request = new EventEmitter();
    data = [Buffer.alloc(1), Buffer.alloc(1)];
    controllerProvider = {};
    IRequest = {};
    eventEmitter = new EventEmitter();
    let injector = Injector.createAndResolve(ControllerResolver, [
      {provide: "data", useValue: data},
      {provide: "request", useValue: request},
      {provide: "response", useValue: response},
      {provide: "url", useValue: url},
      {provide: "UUID", useValue: id},
      {provide: "controllerProvider", useValue: controllerProvider},
      {provide: "actionName", useValue: actionName},
      {provide: "resolvedRoute", useValue: resolvedRoute},
      {provide: "isForwarded", useValue: false},
      {provide: "isForwarder", useValue: false},
      {provide: "isChainStopped", useValue: false},
      {provide: EventEmitter, useValue: eventEmitter},
      {provide: Request, useValue: IRequest},
      {
        provide: LOGGER,
        useFactory: () => {
          log4js.addLayout('json', function (config) {
            return function (logEvent) {
              return JSON.stringify(logEvent) + config.separator;
            }
          });
          return log4js.configure({
            appenders: {
              out: {type: 'stdout', layout: {type: 'json', separator: ','}}
            },
            categories: {
              default: {appenders: ['out'], level: 'info'}
            }
          }).getLogger();
        }
      }
    ]);
    controllerResolver = injector.get(ControllerResolver);
  });

  test("ControllerResolver.constructor", () => {
    expect(controllerResolver).toBeInstanceOf(ControllerResolver);
  });

  test("ControllerResolver.stopChain", () => {
    expect(Reflect.get(controllerResolver, "isChainStopped")).toBeFalsy();
    controllerResolver.stopChain();
    expect(Reflect.get(controllerResolver, "isChainStopped")).toBeTruthy();
  });

  test("ControllerResolver.destroy", () => {
    let aSpy = jest.spyOn(eventEmitter, "emit");
    let bSpy = jest.spyOn(eventEmitter, "removeAllListeners");
    controllerResolver.destroy();
    expect(aSpy).toHaveBeenCalledWith("destroy");
    expect(bSpy).toHaveBeenCalled()
  });

  test("ControllerResolver.getEventEmitter", () => {
    expect(controllerResolver.getEventEmitter()).toEqual(eventEmitter);
  });

  test("ControllerResolver.getIncomingMessage", () => {
    expect(controllerResolver.getIncomingMessage()).toEqual(request);
  });

  test("ControllerResolver.getServerResponse", () => {
    expect(controllerResolver.getServerResponse()).toEqual(response);
  });

  test("ControllerResolver.getBody", () => {
    expect(controllerResolver.getBody()).toEqual(Buffer.concat(data));
  });

  test("ControllerResolver.getUUID", () => {
    expect(controllerResolver.getUUID()).toBe(id);
  });

  test("ControllerResolver.process", () => {
    let aSpy = jest.spyOn(controllerResolver, "processController");
    aSpy.mockReturnValue(null);
    let arg = controllerResolver.process();
    let rArgs = aSpy.mock.calls[0];
    expect(aSpy).toHaveBeenCalledWith(rArgs[0], controllerProvider, "action");
    expect(arg).toBeNull();
  });

  test("ControllerResolver.hasMappedAction", () => {
    class B {
      @Action("index")
      index() {

      }
    }

    let provider = verifyProvider(B);
    expect(controllerResolver.hasMappedAction(provider, "index")).toBeTruthy();
    expect(controllerResolver.hasMappedAction(provider, "nomappedAction")).toBeFalsy();
  });

  test("ControllerResolver.getMappedAction", () => {
    class A {
      @Action("parent")
      actionParent() {

      }

      @Before("index")
      beforeIndex() {

      }
    }

    class B extends A {
      @Action("index")
      actionIndex() {

      }
    }

    let aProvider = verifyProvider(A);
    let bProvider = verifyProvider(B);
    expect(controllerResolver.hasMappedAction(aProvider, "index")).toBeFalsy();
    expect(controllerResolver.hasMappedAction(aProvider, "parent")).toBeTruthy();
    expect(controllerResolver.hasMappedAction(bProvider, "index")).toBeTruthy();
    expect(controllerResolver.hasMappedAction(bProvider, "parent")).toBeTruthy();

    expect(controllerResolver.getMappedAction(aProvider, "parent")).not.toBeNull();
    expect(controllerResolver.getMappedAction(bProvider, "index")).not.toBeNull();
    expect(controllerResolver.getMappedAction(bProvider, "parent")).not.toBeNull();

    expect(controllerResolver.getMappedAction(aProvider, "index", Before)).not.toBeNull();
    expect(controllerResolver.getMappedAction(bProvider, "index", Before)).not.toBeNull();

    expect(() => {
      controllerResolver.getMappedAction(aProvider, "index");
    }).toThrow(`@Action("index") is not defined on controller A`);

    let action: IMetadata = controllerResolver.getMappedAction(bProvider, "index", Before);
    expect(action.propertyKey).toBe("beforeIndex");
    expect(action.decoratorType).toBe("method");
    expect(action.args.name).toBe("index");
    expect(action.designType).toBe(Function);
  });


  test("ControllerResolver.getDecoratorByMappedAction", () => {
    class A {
      @Action("parent")
      actionParent() {

      }

      @Before("index")
      beforeIndex() {

      }
    }

    class B extends A {


      @Action("index")
      @Produces("application/json")
      actionIndex() {

      }
    }

    let bProvider = verifyProvider(B);

    let action: IMetadata = controllerResolver.getMappedAction(bProvider, "index");
    expect(action.propertyKey).toBe("actionIndex");
    expect(action.decoratorType).toBe("method");
    expect(action.args.name).toBe("index");
    expect(action.designType).toBe(Function);
  });


  test("ControllerResolver.getMappedActionArguments", () => {
    class A {
      @Action("parent")
      actionParent() {

      }
    }

    class B extends A {

      constructor(private test: log4js.Logger) {
        super();
        console.log("TEST", test);
      }

      @Action("index")
      actionIndex(@Param("a") p1, @Inject(log4js.Logger) p2, @Param("a1") p3, @Inject(log4js.Logger) p4, @Chain() p5, @ErrorMessage() p6, p7: log4js.Logger, p8): any {

      }
    }

    let bProvider = verifyProvider(B);
    let action: IMetadata = controllerResolver.getMappedAction(bProvider, "index");
    let arg = controllerResolver.getMappedActionArguments(bProvider, action);

    expect(arg).toEqual([
      {
        "args": [
          Object,
          Object,
          Object,
          Object,
          Object,
          Object,
          null,
          Object
        ],
        "metadataKey": "design:paramtypes",
        "propertyKey": "actionIndex"
      },
      {
        "args": {
          "isMutable": false
        },
        "decorator": {
          "@typeix:id": "@typeix:mixed:Inject:43d98213-50d4-4005-a325-1eb86b6872e7",
          "@typeix:name": "Inject",
          "@typeix:type": "mixed",
          "@typeix:uuid": "43d98213-50d4-4005-a325-1eb86b6872e7"
        },
        "decoratorType": "mixed",
        "designParam": "[Circular reference found] Truncated by IDE",
        "designReturn": "[Circular reference found] Truncated by IDE",
        "designType": {},
        "metadataKey": "@typeix:mixed:Inject:43d98213-50d4-4005-a325-1eb86b6872e7:3",
        "paramIndex": 3,
        "propertyKey": "actionIndex",
        "type": "parameter"
      },
      {
        "args": {
          "isMutable": false
        },
        "decorator": "[Circular reference found] Truncated by IDE",
        "decoratorType": "mixed",
        "designParam": "[Circular reference found] Truncated by IDE",
        "designReturn": "[Circular reference found] Truncated by IDE",
        "designType": "[Circular reference found] Truncated by IDE",
        "metadataKey": "@typeix:mixed:Inject:43d98213-50d4-4005-a325-1eb86b6872e7:1",
        "paramIndex": 1,
        "propertyKey": "actionIndex",
        "type": "parameter"
      }
    ]);

  });


  test("ControllerResolver.processAction", () => {
    let aSpy = jest.spyOn(eventEmitter, "emit");

    @Controller({
      name: BOOTSTRAP_MODULE
    })
    class A {

      @Action("index")
      @Produces("application/json")
      actionIndex(@Param("a") param, @Inject(log4js.Logger) logger, @Param("b") b, @Chain() chain, @Inject(log4js.Logger) lg): any {
        return [param, logger, b, chain, lg];
      }
    }

    let aProvider = verifyProvider(A);
    let action: IMetadata = controllerResolver.getMappedAction(aProvider, "index");
    let chain = Chain.toString();

    // create controller injector
    let injector = new Injector(null, [chain]);
    injector.set(chain, "CHAIN");

    injector.createAndResolve(aProvider, verifyProviders([log4js.Logger]));


    let result: any = controllerResolver.processAction(injector, aProvider, action);
    expect(result).not.toBeNull();
    expect(aSpy).toHaveBeenCalledWith("contentType", "application/json");

    expect(result).toEqual([1, injector.get(log4js.Logger), 2, "CHAIN", injector.get(log4js.Logger)]);

  });


  test("ControllerResolver.processFilters", (done) => {

    @Filter(10)
    class AFilter implements IFilter {

      before(data: string): string | Buffer | Promise<string | Buffer> {
        return "aFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "aFilter <- " + data;
      }

    }

    @Filter(20)
    class BFilter implements IFilter {

      before(data: string): string | Buffer | Promise<string | Buffer> {
        return "bFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "bFilter <- " + data;
      }

    }

    @Controller({
      filters: [AFilter, BFilter],
      name: BOOTSTRAP_MODULE
    })
    class A {

      @Action("index")
      @Produces("application/json")
      actionIndex(@Param("a") param, @Inject(log4js.Logger) logger, @Param("b") b, @Chain() chain, @Inject(log4js.Logger) lg): any {
        return {
          param,
          logger,
          chain
        };
      }
    }

    let aProvider = verifyProvider(A);
    let chain = Chain.toString();

    // create controller injector
    let injector = new Injector(null, [chain]);
    injector.set(chain, "CHAIN");

    let metadata = getClassMetadata(aProvider.provide, Controller)?.args;

    let result: Promise<any> = controllerResolver.processFilters(injector, metadata, false);
    expect(result).toBeInstanceOf(Promise);
    result.then(data => {
      expect(data).not.toBeNull();
      expect(data).toBe("aFilter <- bFilter <- CHAIN");
      done();
    })
      .catch(done);
  });


  test("ControllerResolver.processController no action chain", (done) => {
    @Controller({
      name: BOOTSTRAP_MODULE
    })
    class A {

      @Action("index")
      actionIndex(@Param("a") param, @Chain() chain): any {
        return {
          param,
          chain
        };
      }
    }

    let aProvider = verifyProvider(A);
    // process controller
    let result = controllerResolver.processController(new Injector(), aProvider, "index");
    expect(result).toBeInstanceOf(Promise);

    result.then(data => {
      expect(data).not.toBeNull();
      expect(data).toEqual({
        param: 1,
        chain: null
      });
      done();
    })
      .catch(done);

  });

  test("ControllerResolver.processController action chain no filter", (done) => {


    @Controller({
      name: BOOTSTRAP_MODULE
    })
    class A {

      @BeforeEach()
      actionBeforeEach(@Chain() chain): any {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain() chain): any {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain() chain): any {
        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain() chain): any {
        return "after <- " + chain;
      }

      @AfterEach()
      actionAfterEach(@Chain() chain): any {
        return "afterEach <- " + chain;
      }

    }

    let injector = Injector.createAndResolve(log4js.Logger, []);
    let result = fakeControllerActionCall(
      injector,
      verifyProvider(A),
      "index"
    );
    expect(result).toBeInstanceOf(Promise);

    result.then(data => {
      expect(data).not.toBeNull();
      expect(data).toBe("afterEach <- after <- action <- before <- beforeEach <- null");
      done();
    })
      .catch(done);

  });


  test("ControllerResolver.processController with filters", (done) => {

    @Filter(10)
    class AFilter implements IFilter {

      before(data: string): string | Buffer | Promise<string | Buffer> {
        return "aFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "aFilter <- " + data;
      }

    }

    @Filter(20)
    class BFilter implements IFilter {

      before(data: string): string | Buffer | Promise<string | Buffer> {
        return "bFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "bFilter <- " + data;
      }

    }

    @Controller({
      name: BOOTSTRAP_MODULE,
      filters: [AFilter, BFilter]
    })
    class A {

      @BeforeEach()
      actionBeforeEach(@Chain() chain: string): string {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain() chain: string): string {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain() chain: string): string {
        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain() chain: string): string {
        return "after <- " + chain;
      }

      @AfterEach()
      actionAfterEach(@Chain() chain: string): string {
        return "afterEach <- " + chain;
      }

    }

    let injector = Injector.createAndResolve(log4js.Logger, []);
    let result = fakeControllerActionCall(
      injector,
      verifyProvider(A),
      "index"
    );
    expect(result).toBeInstanceOf(Promise);

    result.then(data => {
      expect(data).not.toBeNull();
      expect(data).toBe("aFilter <- bFilter <- afterEach <- after <- action <- before <- beforeEach <- aFilter <- bFilter <- null");
      done();
    })
      .catch(done);

  });


  test("ControllerResolver.processController with stopChain", (done) => {

    @Filter(10)
    class AFilter implements IFilter {

      before(data: string): string | Buffer | Promise<string | Buffer> {
        return "aFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "aFilter <- " + data;
      }

    }

    @Filter(20)
    class BFilter implements IFilter {

      before(data: string): string | Buffer | Promise<string | Buffer> {
        return "bFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "bFilter <- " + data;
      }

    }

    @Controller({
      name: BOOTSTRAP_MODULE,
      filters: [AFilter, BFilter]
    })
    class A {

      @Inject(Request)
      private request: Request;

      @BeforeEach()
      actionBeforeEach(@Chain() chain: string): string {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain() chain: string): string {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain() chain: string): string {

        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain() chain: string): string {
        this.request.stopChain();
        return "after <- " + chain;
      }

      @AfterEach()
      actionAfterEach(@Chain() chain: string): string {
        return "afterEach <- " + chain;
      }

    }

    let injector = Injector.createAndResolve(log4js.Logger, []);
    let result = fakeControllerActionCall(
      injector,
      verifyProvider(A),
      "index"
    );
    expect(result).toBeInstanceOf(Promise);

    result.then(data => {
      expect(data).not.toBeNull();
      expect(data).toBe("after <- action <- before <- beforeEach <- aFilter <- bFilter <- null");
      done();
    })
      .catch(done);

  });


  test("ControllerResolver.processController with stopChain in Filter 1", (done) => {

    @Filter(10)
    class AFilter implements IFilter {

      @Inject(Request)
      private request: Request;

      before(data: string): string | Buffer | Promise<string | Buffer> {
        this.request.stopChain();
        return "aFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "aFilter <- " + data;
      }

    }

    @Filter(20)
    class BFilter implements IFilter {

      before(data: string): string | Buffer | Promise<string | Buffer> {
        return "bFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "bFilter <- " + data;
      }

    }

    @Controller({
      name: BOOTSTRAP_MODULE,
      filters: [AFilter, BFilter]
    })
    class A {

      @Inject(Request)
      private request: Request;

      @BeforeEach()
      actionBeforeEach(@Chain() chain: string): string {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain() chain: string): string {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain() chain: string): string {

        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain() chain: string): string {
        this.request.stopChain();
        return "after <- " + chain;
      }

      @AfterEach()
      actionAfterEach(@Chain() chain: string): string {
        return "afterEach <- " + chain;
      }

    }

    let injector = Injector.createAndResolve(log4js.Logger, []);
    let result = fakeControllerActionCall(
      injector,
      verifyProvider(A),
      "index"
    );
    expect(result).toBeInstanceOf(Promise);

    result.then(data => {
      expect(data).not.toBeNull()
      expect(data).toBe("aFilter <- bFilter <- null");
      done();
    })
      .catch(done);
  });


  test("ControllerResolver.processController with stopChain in Filter 2", (done) => {

    @Filter(10)
    class AFilter implements IFilter {

      @Inject(Request)
      private request: Request;

      before(data: string): string | Buffer | Promise<string | Buffer> {
        this.request.stopChain();
        return "aFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "aFilter <- " + data;
      }

    }

    @Filter(20)
    class BFilter implements IFilter {

      @Inject(Request)
      private request: Request;


      before(data: string): string | Buffer | Promise<string | Buffer> {
        this.request.stopChain();
        return "bFilter <- " + data;
      }

      after(data: string): string | Buffer | Promise<string | Buffer> {
        return "bFilter <- " + data;
      }

    }

    @Controller({
      name: BOOTSTRAP_MODULE,
      filters: [AFilter, BFilter]
    })
    class A {

      @Inject(Request)
      private request: Request;

      @BeforeEach()
      actionBeforeEach(@Chain() chain: string): string {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain() chain: string): string {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain() chain: string): string {

        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain() chain: string): string {
        this.request.stopChain();
        return "after <- " + chain;
      }

      @AfterEach()
      actionAfterEach(@Chain() chain: string): string {
        return "afterEach <- " + chain;
      }

    }

    // process controller

    let result = fakeControllerActionCall(
      new Injector,
      A,
      "index"
    );

    expect(result).toBeInstanceOf(Promise);

    result.then(data => {
      expect(data).not.toBeNull()
      expect(data).toBe("bFilter <- null");
      done();
    })
      .catch(done);
  });


});

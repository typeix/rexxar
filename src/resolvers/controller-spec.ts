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
  Produces
} from "..";
import {fakeControllerActionCall} from "../helpers/mocks";
import {BOOTSTRAP_MODULE} from "../decorators/module";
import {getClassMetadata, getDecoratorId, IMetadata} from "@typeix/metadata";
import {ACTION_CONFIG} from "../servers/constants";
import {Logger} from "@typeix/logger";


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
      Logger
    ]);


    injector.set(ACTION_CONFIG, [BeforeEach, Before, Action, After, AfterEach]);
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
    expect(action.args.value).toBe("index");
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
    expect(action.args.value).toBe("index");
    expect(action.designType).toBe(Function);
  });


  test("ControllerResolver.processAction", () => {
    let aSpy = jest.spyOn(eventEmitter, "emit");

    @Controller({
      name: BOOTSTRAP_MODULE
    })
    class A {

      @Action("index")
      @Produces("application/json")
      actionIndex(@Param("a") param, @Inject(Logger) logger, @Param("b") b, @Chain() chain, @Inject(Logger) lg): any {
        return [param, logger, b, chain, lg];
      }
    }

    let aProvider = verifyProvider(A);
    let action: IMetadata = controllerResolver.getMappedAction(aProvider, "index");

    // create controller injector
    let injector = new Injector(null, [Chain.toString()]);
    injector.set(Chain.toString(), "CHAIN");
    injector.set(ACTION_CONFIG,  [BeforeEach, Before, Action, After, AfterEach]);
    injector.createAndResolve(aProvider, verifyProviders([Logger]));


    let result: any = controllerResolver.processAction(injector, aProvider, action);
    expect(result).not.toBeNull();
    expect(aSpy).toHaveBeenCalledWith("contentType", "application/json");

    expect(result).toEqual([1, injector.get(Logger), 2, "CHAIN", injector.get(Logger)]);

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
      actionIndex(@Param("a") param, @Inject(Logger) logger, @Param("b") b, @Chain() chain, @Inject(Logger) lg): any {
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

    let metadata = getClassMetadata(Controller, aProvider.provide)?.args;

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
    let injector = new Injector()
    injector.set(ACTION_CONFIG,  [BeforeEach, Before, Action, After, AfterEach]);
    let result = controllerResolver.processController(injector, aProvider, "index");
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

    let injector = Injector.createAndResolve({
      provide: Logger,
      useValue: new Logger({})
    }, []);
    injector.set(ACTION_CONFIG,  [BeforeEach, Before, Action, After, AfterEach]);
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

    let injector = Injector.createAndResolve({
      provide: Logger,
      useValue: new Logger({})
    }, []);
    injector.set(ACTION_CONFIG,  [BeforeEach, Before, Action, After, AfterEach]);
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

    let injector = Injector.createAndResolve({
      provide: Logger,
      useValue: new Logger({})
    }, []);
    injector.set(ACTION_CONFIG,  [BeforeEach, Before, Action, After, AfterEach]);
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

    let injector = Injector.createAndResolve({
      provide: Logger,
      useValue: new Logger({})
    }, []);
    // process controller
    injector.set(ACTION_CONFIG,  [BeforeEach, Before, Action, After, AfterEach]);
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
    let injector = new Injector();
    injector.set(ACTION_CONFIG,  [BeforeEach, Before, Action, After, AfterEach]);
    let result = fakeControllerActionCall(
      injector,
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

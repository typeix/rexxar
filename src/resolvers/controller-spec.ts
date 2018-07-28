import {IResolvedRoute, RestMethods} from "@typeix/router";
import {ControllerResolver} from "./controller";
import {Logger, uuid} from "@typeix/utils";
import {EventEmitter} from "events";
import {IMetadata, Inject, Injector, verifyProvider} from "@typeix/di";
import {Action, Before, Param, Produces} from "..";


describe("ControllerResolver", () => {


  let resolvedRoute: IResolvedRoute;
  let eventEmitter;
  let controllerResolver: ControllerResolver;
  let controllerProvider, IRequest, request, response, data, id = uuid(), url = "/";
  let actionName = "action";

  beforeEach(() => {
    resolvedRoute = {
      method: RestMethods.GET,
      params: {
        a: 1,
        b: 2
      },
      route: "core/index"
    };
    response = new EventEmitter();
    request = new EventEmitter();
    data = [new Buffer(1), new Buffer(1)];
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
      Logger
    ]);
    controllerResolver = injector.get(ControllerResolver);
  });

  test("ControllerResolver.constructor", () => {
    expect(controllerResolver).toBeInstanceOf(ControllerResolver);
  });

  test("ControllerResolver.stopChain", () => {
    expect(Reflect.get(controllerResolver, "isChainStopped")).toBeTruthy();
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
    aSpy.mockReturnValue(0);
    let arg = controllerResolver.process();
    expect(aSpy).toHaveBeenCalledWith(arg, controllerProvider, actionName);
  });

  test("ControllerResolver.hasMappedAction", () => {
    class B {
      @Action("index")
      index() {

      }
    }

    let provider = verifyProvider(B);
    expect(controllerResolver.hasMappedAction(provider, "index")).toBeTruthy();
    expect(controllerResolver.hasMappedAction(provider, "nomappedAction")).toBeTruthy();
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

    expect(controllerResolver.getMappedAction(aProvider, "index", "Before")).not.toBeNull();
    expect(controllerResolver.getMappedAction(bProvider, "index", "Before")).not.toBeNull();

    expect(() => {
      controllerResolver.getMappedAction(aProvider, "index");
    }).toThrow(`@Action("index") is not defined on controller A`);

    let action: IMetadata = controllerResolver.getMappedAction(bProvider, "index", "Before");
    let bAction: IMetadata = {
      metadataKey: "typeix:rexxar:@Before",
      targetKey: "beforeIndex",
      metadataValue: {}

    };
    expect(action).toEqual(bAction);
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
    let bAction: IMetadata = {
      metadataKey: "typeix:rexxar:@Before",
      targetKey: "beforeIndex",
      metadataValue: {}

    };
    expect(action).toEqual(bAction);

    let produces = controllerResolver.getDecoratorByMappedAction(bProvider, action, "Produces");
    expect(produces).toEqual( {
      "key": "actionIndex",
      "proto": produces.proto,
      "type": "Produces",
      "value": "application/json"
    });

    expect(controllerResolver.getDecoratorByMappedAction(bProvider, action, "Undefined")).toBeUndefined();
  });

/*
  test("ControllerResolver.getMappedActionArguments", () => {
    class A {
      @Action("parent")
      actionParent() {

      }
    }

    class B extends A {

      constructor(private test: Logger) {
        super();
        console.log("TEST", test);
      }

      @Action("index")
      actionIndex(@Param("a") param, @Inject(Logger) logger): any {

      }
    }

    let bProvider = verifyProvider(B);
    let action: IAction = controllerResolver.getMappedAction(bProvider, "index");
    let arg = controllerResolver.getMappedActionArguments(bProvider, action);

    assert.deepEqual(arg, [
        {
          Class: B,
          type: 'Inject',
          key: 'actionIndex',
          value: Logger,
          paramIndex: 1
        },
        {
          Class: B,
          type: "Param",
          key: 'actionIndex',
          value: 'a',
          paramIndex: 0
        }
      ]
    );

  });


  test("ControllerResolver.processAction", () => {
    let aSpy = spy(eventEmitter, "emit");

    @Controller({
      name: "root"
    })
    class A {

      @Action("index")
      @Produces("application/json")
      actionIndex(@Param("a") param, @Inject(Logger) logger, @Param("b") b, @Chain chain, @Inject(Logger) lg): any {
        return {
          param,
          logger,
          chain
        };
      }
    }

    let aProvider = Metadata.verifyProvider(A);
    let action: IAction = controllerResolver.getMappedAction(aProvider, "index");
    let chain = "__chain__";

    // create controller injector
    let injector = new Injector(null, [chain]);
    injector.set(chain, "CHAIN");

    let controller = injector.createAndResolve(aProvider, Metadata.verifyProviders([Logger]));

    let cSpy = spy(controller, "actionIndex");

    let result: any = controllerResolver.processAction(injector, aProvider, action);
    assert.isNotNull(result);
    assertSpy.calledWith(aSpy, "contentType", "application/json");
    assertSpy.calledWith(cSpy, 1, injector.get(Logger), 2, "CHAIN", injector.get(Logger));

    assert.deepEqual(result, {
      param: 1,
      logger: injector.get(Logger),
      chain: "CHAIN"
    });

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
      name: "root"
    })
    class A {

      @Action("index")
      @Produces("application/json")
      actionIndex(@Param("a") param, @Inject(Logger) logger, @Param("b") b, @Chain chain, @Inject(Logger) lg): any {
        return {
          param,
          logger,
          chain
        };
      }
    }

    let aProvider = Metadata.verifyProvider(A);
    let chain = "__chain__";

    // create controller injector
    let injector = new Injector(null, [chain]);
    injector.set(chain, "CHAIN");

    let metadata: IControllerMetadata = Metadata.getComponentConfig(aProvider.provide);

    let result: Promise<any> = controllerResolver.processFilters(injector, metadata, false);
    assert.instanceOf(result, Promise);
    result.then(data => {
      assert.isNotNull(data);
      assert.equal(data, "aFilter <- bFilter <- CHAIN");
      done();
    })
      .catch(done);
  });


  test("ControllerResolver.processController no action chain", (done) => {
    @Controller({
      name: "root"
    })
    class A {

      @Action("index")
      actionIndex(@Param("a") param, @Chain chain): any {
        return {
          param,
          chain
        };
      }
    }

    let aProvider = Metadata.verifyProvider(A);
    // process controller
    let result = controllerResolver.processController(new Injector(), aProvider, "index");
    assert.instanceOf(result, Promise);

    result.then(data => {
      assert.isNotNull(data);
      assert.deepEqual(data, {
        param: 1,
        chain: null
      });
      done();
    })
      .catch(done);

  });

  test("ControllerResolver.processController action chain no filter", (done) => {


    @Controller({
      name: "root"
    })
    class A {

      @BeforeEach
      actionBeforeEach(@Chain chain): any {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain chain): any {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain chain): any {
        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain chain): any {
        return "after <- " + chain;
      }

      @AfterEach
      actionAfterEach(@Chain chain): any {
        return "afterEach <- " + chain;
      }

    }

    let injector = Injector.createAndResolve(Logger, []);
    let result = fakeControllerActionCall(
      injector,
      Metadata.verifyProvider(A),
      "index"
    );
    assert.instanceOf(result, Promise);

    result.then(data => {
      assert.isNotNull(data);
      assert.deepEqual(data, "afterEach <- after <- action <- before <- beforeEach <- null");
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
      name: "root",
      filters: [AFilter, BFilter]
    })
    class A {

      @BeforeEach
      actionBeforeEach(@Chain chain: string): string {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain chain: string): string {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain chain: string): string {
        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain chain: string): string {
        return "after <- " + chain;
      }

      @AfterEach
      actionAfterEach(@Chain chain: string): string {
        return "afterEach <- " + chain;
      }

    }

    let injector = Injector.createAndResolve(Logger, []);
    let result = fakeControllerActionCall(
      injector,
      Metadata.verifyProvider(A),
      "index"
    );
    assert.instanceOf(result, Promise);

    result.then(data => {
      assert.isNotNull(data);
      assert.deepEqual(data, "aFilter <- bFilter <- afterEach <- after <- action <- before <- beforeEach <- aFilter <- bFilter <- null");
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
      name: "root",
      filters: [AFilter, BFilter]
    })
    class A {

      @Inject(Request)
      private request: Request;

      @BeforeEach
      actionBeforeEach(@Chain chain: string): string {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain chain: string): string {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain chain: string): string {

        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain chain: string): string {
        this.request.stopChain();
        return "after <- " + chain;
      }

      @AfterEach
      actionAfterEach(@Chain chain: string): string {
        return "afterEach <- " + chain;
      }

    }

    let injector = Injector.createAndResolve(Logger, []);
    let result = fakeControllerActionCall(
      injector,
      Metadata.verifyProvider(A),
      "index"
    );
    assert.instanceOf(result, Promise);

    result.then(data => {
      assert.isNotNull(data);
      assert.deepEqual(data, "after <- action <- before <- beforeEach <- aFilter <- bFilter <- null");
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
      name: "root",
      filters: [AFilter, BFilter]
    })
    class A {

      @Inject(Request)
      private request: Request;

      @BeforeEach
      actionBeforeEach(@Chain chain: string): string {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain chain: string): string {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain chain: string): string {

        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain chain: string): string {
        this.request.stopChain();
        return "after <- " + chain;
      }

      @AfterEach
      actionAfterEach(@Chain chain: string): string {
        return "afterEach <- " + chain;
      }

    }

    let injector = Injector.createAndResolve(Logger, []);
    let result = fakeControllerActionCall(
      injector,
      Metadata.verifyProvider(A),
      "index"
    );
    assert.instanceOf(result, Promise);

    result.then(data => {
      assert.isNotNull(data);
      assert.deepEqual(data, "aFilter <- bFilter <- null");
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
      name: "root",
      filters: [AFilter, BFilter]
    })
    class A {

      @Inject(Request)
      private request: Request;

      @BeforeEach
      actionBeforeEach(@Chain chain: string): string {
        return "beforeEach <- " + chain;
      }

      @Before("index")
      actionBefore(@Chain chain: string): string {
        return "before <- " + chain;
      }

      @Action("index")
      actionIndex(@Chain chain: string): string {

        return "action <- " + chain;
      }

      @After("index")
      actionAfter(@Chain chain: string): string {
        this.request.stopChain();
        return "after <- " + chain;
      }

      @AfterEach
      actionAfterEach(@Chain chain: string): string {
        return "afterEach <- " + chain;
      }

    }

    // process controller

    let result = fakeControllerActionCall(
      new Injector,
      A,
      "index"
    );

    assert.instanceOf(result, Promise);

    result.then(resolved => {
      assert.isNotNull(resolved);
      assert.deepEqual(resolved, "bFilter <- null");
      done();
    })
      .catch(done);
  });

  */
});

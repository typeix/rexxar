import {EventEmitter} from "events";
import {parse} from "url";
import {setTimeout} from "timers";
import {IResolvedRoute, RestMethods, Router} from "@typeix/router";
import {RequestResolver} from "./request";
import {Logger, uuid} from "@typeix/utils";
import {Injector} from "@typeix/di";
import {ModuleInjector} from "@typeix/modules";



describe("RequestResolver", () => {
  let resolvedRoute: IResolvedRoute;
  let routeResolver: RequestResolver;
  let request, response, data, id = uuid();



  beforeEach(() => {
    resolvedRoute = {
      method: RestMethods.GET,
      params: {
        a: 1,
        b: 2
      },
      route: "core/index"
    };
    class ResponseEmitter extends EventEmitter {
      writeHead() {
      }

      write() {
      }

      end() {
      }

      invalid() {
        return 1;
      }
    }
    response = new ResponseEmitter();
    request = new ResponseEmitter();
    data = [new Buffer(1), new Buffer(1)];
  });


  it("Should initialize", () => {
    let injector = Injector.createAndResolveChild(
      new Injector(),
      RequestResolver,
      [
        Logger,
        Router,
        {provide: "url", useValue: parse("/", true)},
        {provide: "UUID", useValue: id},
        {provide: "data", useValue: data},
        {provide: "contentType", useValue: "text/html"},
        {provide: "statusCode", useValue: 200},
        {provide: "request", useValue: request},
        {provide: "response", useValue: response},
        {provide: ModuleInjector, useValue: new ModuleInjector()},
        EventEmitter
      ]
    );
    routeResolver = injector.get(RequestResolver);
    expect(routeResolver).not.toBeNull();
  });

  /*
  it("Should render", (done) => {
    let toRender = "RENDER";
    let aSpy = spy(response, "writeHead");
    let a2Spy = spy(response, "write");
    let a3Spy = spy(response, "end");
    let resolve = routeResolver.render(toRender, RenderType.DATA_HANDLER);
    resolve.then(rendered => {
      assertSpy.calledWith(aSpy, 200, {"Content-Type": "text/html"});
      assertSpy.calledWith(a2Spy, toRender);
      assertSpy.called(a3Spy);
      assert.equal(rendered, toRender);
      done();
    }).catch(done);
  });

  it("Should render throws error", (done) => {
    let resolve = routeResolver.render(Reflect.get(response, "invalid").call(), RenderType.DATA_HANDLER);
    resolve.catch(result => {
      assert.equal(result.message, "ResponseType must be string or buffer");
    }).then(done).catch(done);
  });


  it("Should getControllerProvider", () => {

    @Controller({
      name: "core"
    })
    class MyController {

      @Action("index")
      actionIndex() {
      }
    }

    @Module({
      name: "root",
      controllers: [MyController]
    })
    class MyModule {
    }

    let modules: Array<IModule> = createModule(MyModule);
    let module: IResolvedModule = {
      module: getModule(modules),
      controller: "core",
      action: "index",
      resolvedRoute,
      data
    };

    let provider = Metadata.verifyProvider(MyController);
    let controllerProvider: IProvider = RequestResolver.getControllerProvider(module);
    assert.deepEqual(provider, controllerProvider);
  });


  it("Should getControllerProvider no route", () => {

    @Controller({
      name: "core"
    })
    class MyController {

      @Action("index")
      actionIndex() {
      }
    }

    @Module({
      name: "root",
      controllers: [MyController]
    })
    class MyModule {
    }

    let modules: Array<IModule> = createModule(MyModule);
    let module: IResolvedModule = {
      module: getModule(modules),
      controller: "test",
      action: "index",
      resolvedRoute,
      data
    };

    assert.throws(() => {
      RequestResolver.getControllerProvider(module);
    }, "You must define controller within current route: core/index");
  });


  it("Should processModule", (done) => {

    let value = "MY_VALUE";

    @Controller({
      name: "core"
    })
    class MyController {

      @Action("index")
      actionIndex() {
        return value;
      }
    }

    @Module({
      name: "root",
      providers: [Logger, Router],
      controllers: [MyController]
    })
    class MyModule {
    }

    let modules: Array<IModule> = createModule(MyModule);
    let module: IResolvedModule = {
      module: getModule(modules),
      controller: "core",
      action: "index",
      resolvedRoute,
      data
    };

    Promise.resolve(routeResolver.processModule(module))
      .then(resolved => {
        assert.equal(resolved, value);
        done();
      }).catch(done);
  });


  it("Should process GET", (done) => {

    let value = "MY_VALUE";

    @Controller({
      name: "core"
    })
    class MyController {

      @Action("index")
      actionIndex() {
        return value;
      }
    }

    @Module({
      name: "root",
      providers: [Logger, Router],
      controllers: [MyController]
    })
    class MyModule implements IAfterConstruct {
      afterConstruct(): void {
        this.router.addRules([{
          methods: [Methods.GET],
          url: "/",
          route: "core/index"
        }]);
      }

      @Inject(Router)
      private router: Router;
    }

    request.method = "GET";
    request.url = "/";
    request.headers = {};

    let modules: Array<IModule> = createModule(MyModule);
    let injector = Injector.createAndResolveChild(
      getModule(modules).injector,
      RequestResolver,
      [
        {provide: "url", useValue: parse("/", true)},
        {provide: "UUID", useValue: id},
        {provide: "data", useValue: data},
        {provide: "contentType", useValue: "text/html"},
        {provide: "statusCode", useValue: 200},
        {provide: "request", useValue: request},
        {provide: "response", useValue: response},
        {provide: "modules", useValue: modules},
        EventEmitter
      ]
    );
    let myRouteResolver = injector.get(RequestResolver);


    let aSpy = spy(myRouteResolver, "render");

    Promise.resolve(myRouteResolver.process())
      .then(resolved => {
        assert.equal(resolved, value);
        assertSpy.calledWith(aSpy, value);
        done();
      }).catch(done);
  });


  it("Should process POST", (done) => {

    let value = "MY_VALUE";

    @Controller({
      name: "core"
    })
    class MyController {

      @Action("index")
      actionIndex() {
        return value;
      }
    }

    @Module({
      name: "root",
      providers: [Logger, Router],
      controllers: [MyController]
    })
    class MyModule implements IAfterConstruct {
      afterConstruct(): void {
        this.router.addRules([{
          methods: [Methods.POST],
          url: "/",
          route: "core/index"
        }]);
      }

      @Inject(Router)
      private router: Router;
    }

    request.method = "POST";
    request.url = "/";
    request.headers = {};

    let modules: Array<IModule> = createModule(MyModule);
    let injector = Injector.createAndResolveChild(
      getModule(modules).injector,
      RequestResolver,
      [
        {provide: "url", useValue: parse("/", true)},
        {provide: "UUID", useValue: id},
        {provide: "data", useValue: []},
        {provide: "contentType", useValue: "text/html"},
        {provide: "statusCode", useValue: 200},
        {provide: "request", useValue: request},
        {provide: "response", useValue: response},
        {provide: "modules", useValue: modules},
        EventEmitter
      ]
    );
    let myRouteResolver = injector.get(RequestResolver);

    let a = [Buffer.from("a"), Buffer.from("b"), Buffer.from("c")];

    // simulate async data processing
    setTimeout(() => {
      request.emit("data", a[0]);
      request.emit("data", a[1]);
      request.emit("data", a[2]);
      request.emit("end");
    }, 0);

    let aSpy = spy(myRouteResolver, "render");
    let bSpy = spy(myRouteResolver, "processModule");

    Promise.resolve(myRouteResolver.process())
      .then(resolved => {
        let module: IResolvedModule = {
          module: getModule(modules, "root"),
          controller: "core",
          action: "index",
          resolvedRoute: {
            method: Methods.POST,
            params: {},
            route: "core/index"
          },
          data: a
        };
        assert.equal(resolved, value);
        assertSpy.calledWith(aSpy, value);
        assertSpy.calledWith(bSpy, module);
        done();
      }).catch(done);
  });
*/

});

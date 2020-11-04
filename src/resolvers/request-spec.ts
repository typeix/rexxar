import {EventEmitter} from "events";
import {parse} from "url";
import {IResolvedRoute, HttpMethod, Router} from "@typeix/router";
import {IResolvedModule, RenderType, RequestResolver} from "./request";
import {uuid} from "@typeix/utils";
import {IAfterConstruct, Inject, Injector, IProvider, verifyProvider} from "@typeix/di";
import {ModuleInjector} from "@typeix/modules";
import {Action, Controller, LOGGER, Module} from "..";
import {BOOTSTRAP_MODULE} from "../decorators/module";
import * as log4js from "log4js";


const loggerProvider = {
  provide: LOGGER,
  useFactory: () => {
    return log4js.configure({
      appenders: {
        out: {type: 'stdout', layout: {type: 'json', separator: ','}}
      },
      categories: {
        default: {appenders: ['out'], level: 'info'}
      }
    }).getLogger();
  }
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

/**
 * Creates resolver internal
 */
function createResolver(
  id: string,
  data: Array<Buffer>,
  request: ResponseEmitter,
  response: ResponseEmitter,
  moduleInjector: ModuleInjector = new ModuleInjector(),
  _injector: Injector = new Injector()
): RequestResolver {
  if (!_injector.has(LOGGER)) {
    _injector.createAndResolve(verifyProvider(loggerProvider),
      []);
  }
  if (!_injector.has(Router)) {
    _injector.createAndResolve(verifyProvider(Router), []);
  }
  let injector = Injector.createAndResolveChild(
    _injector,
    RequestResolver,
    [
      {provide: "url", useValue: parse("/", true)},
      {provide: "UUID", useValue: id},
      {provide: "data", useValue: data},
      {provide: "contentType", useValue: "text/html"},
      {provide: "statusCode", useValue: 200},
      {provide: "request", useValue: request},
      {provide: "response", useValue: response},
      {provide: ModuleInjector, useValue: moduleInjector},
      EventEmitter
    ]
  );
  return injector.get(RequestResolver);
}

/**
 * Test
 */
describe("RequestResolver", () => {
  let resolvedRoute: IResolvedRoute;
  let request, response, data, id = uuid();


  beforeEach(() => {
    resolvedRoute = {
      method: HttpMethod.GET,
      params: {
        a: 1,
        b: 2
      },
      route: "core/index"
    };
    response = new ResponseEmitter();
    request = new ResponseEmitter();
    data = [Buffer.alloc(1), Buffer.alloc(1)];
  });


  test("Should initialize", () => {

    let requestResolver = createResolver(id, data, request, response);
    expect(requestResolver).not.toBeNull();
  });


  test("Should render", (done) => {
    let requestResolver = createResolver(id, data, request, response);
    let toRender = "RENDER";
    let aSpy = jest.spyOn(response, "writeHead");
    let a2Spy = jest.spyOn(response, "write");
    let a3Spy = jest.spyOn(response, "end");
    let resolve = requestResolver.render(toRender, RenderType.DATA_HANDLER);
    resolve.then(rendered => {
      expect(aSpy).toBeCalledWith(200, {"Content-Type": "text/html"});
      expect(a2Spy).toBeCalledWith(toRender);
      expect(a3Spy).toBeCalled();
      expect(rendered).toEqual(toRender);
      done();
    }).catch(done);
  });

  test("Should render throws error", (done) => {
    let requestResolver = createResolver(id, data, request, response);
    let resolve = requestResolver.render(Reflect.get(response, "invalid").call(), RenderType.DATA_HANDLER);
    resolve.catch(result => {
      expect(result.message).toBe("ResponseType must be string or buffer");
    }).then(done).catch(done);
  });


  test("Should getControllerProvider", () => {

    @Controller({
      name: "core"
    })
    class MyController {

      @Action("index")
      actionIndex() {
      }
    }

    @Module({
      name: BOOTSTRAP_MODULE,
      controllers: [MyController],
      providers: []
    })
    class MyModule {
    }

    let moduleInjector = ModuleInjector.createAndResolve(MyModule, []);
    let requestResolver = createResolver(id, data, request, response, moduleInjector);
    let resolvedModule = requestResolver.getResolvedModule(resolvedRoute);
    let controllerProvider: IProvider = RequestResolver.getControllerProvider(resolvedModule);
    let provider = verifyProvider(MyController);
    expect(provider).toEqual(controllerProvider);
  });


  test("Should getControllerProvider no route", () => {

    @Controller({
      name: "core"
    })
    class MyController {

      @Action("index")
      actionIndex() {
      }
    }

    @Module({
      name: BOOTSTRAP_MODULE,
      controllers: [MyController],
      providers: []
    })
    class MyModule {
    }

    resolvedRoute.route = "test/index";

    expect(() => {
      let moduleInjector = ModuleInjector.createAndResolve(MyModule, []);
      let requestResolver = createResolver(id, data, request, response, moduleInjector);
      let resolvedModule = requestResolver.getResolvedModule(resolvedRoute);
      RequestResolver.getControllerProvider(resolvedModule);
    }).toThrow(/You must define controller within current route: test\/index/g);
  });


  test("Should processModule", (done) => {

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
      name: BOOTSTRAP_MODULE,
      providers: [loggerProvider, Router],
      controllers: [MyController]
    })
    class MyModule {
    }


    let moduleInjector = ModuleInjector.createAndResolve(MyModule, []);
    let requestResolver = createResolver(id, data, request, response, moduleInjector);
    let resolvedModule = requestResolver.getResolvedModule(resolvedRoute);

    Promise.resolve(requestResolver.processModule(resolvedModule))
      .then(resolved => {
        expect(resolved).toEqual(value);
        done();
      }).catch(done);
  });

  test("Should process GET", (done) => {

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
      name: BOOTSTRAP_MODULE,
      providers: [loggerProvider, Router],
      controllers: [MyController]
    })
    class MyModule implements IAfterConstruct {
      afterConstruct(): void {
        this.router.addRules([{
          methods: [HttpMethod.GET],
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

    let moduleInjector = ModuleInjector.createAndResolve(MyModule, []);
    let requestResolver = createResolver(id, data, request, response, moduleInjector, moduleInjector.getInjector(MyModule));
    let mModule = moduleInjector.get(MyModule);
    expect(mModule).toBeInstanceOf(MyModule);

    let aSpy = jest.spyOn(requestResolver, "render");
    requestResolver.process().then(resolved => {
      expect(resolved).toEqual(value);
      expect(aSpy).toHaveBeenCalledWith(value, 1);
      done();
    }).catch(done);
  });


  test("Should process POST", (done) => {

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
      name: BOOTSTRAP_MODULE,
      providers: [loggerProvider, Router],
      controllers: [MyController]
    })
    class MyModule implements IAfterConstruct {
      afterConstruct(): void {
        this.router.addRules([{
          methods: [HttpMethod.POST],
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

    let moduleInjector = ModuleInjector.createAndResolve(MyModule, []);
    let requestResolver = createResolver(id, data, request, response, moduleInjector, moduleInjector.getInjector(MyModule));


    let a = [Buffer.from("a"), Buffer.from("b"), Buffer.from("c")];

    // simulate async data processing
    process.nextTick(() => {
      request.emit("data", a[0]);
      request.emit("data", a[1]);
      request.emit("data", a[2]);
      request.emit("end");
    });

    let aSpy = jest.spyOn(requestResolver, "render");
    let bSpy = jest.spyOn(requestResolver, "processModule");

    Promise.resolve(requestResolver.process())
      .then(resolved => {
        let module: IResolvedModule = requestResolver.getResolvedModule({
          "method": HttpMethod.POST,
          "params": {},
          "route": "core/index"
        });
        expect(resolved).toEqual(value);
        expect(aSpy).toHaveBeenCalledWith(value, 1);
        expect(bSpy).toHaveBeenCalledWith(module);
        done();
      }).catch(done);
  });

});

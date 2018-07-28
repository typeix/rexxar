import {EventEmitter} from "events";
import {parse} from "url";
import {setTimeout} from "timers";
import {IResolvedRoute, RestMethods, Router} from "@typeix/router";
import {RenderType, RequestResolver} from "./request";
import {Logger, uuid} from "@typeix/utils";
import {Injector, IProvider, verifyProvider} from "@typeix/di";
import {ModuleInjector} from "@typeix/modules";
import {Action, Controller, Module} from "..";


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
  moduleInjector = new ModuleInjector()
): RequestResolver {
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
      method: RestMethods.GET,
      params: {
        a: 1,
        b: 2
      },
      route: "core/index"
    };
    response = new ResponseEmitter();
    request = new ResponseEmitter();
    data = [new Buffer(1), new Buffer(1)];
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
      name: "root",
      controllers: [MyController],
      providers: []
    })
    class MyModule {
    }

    let moduleInjector = ModuleInjector.createAndResolve(MyModule);
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
         name: "root",
         controllers: [MyController],
         providers: []
       })
       class MyModule {
       }

       resolvedRoute.route = "test/index";

       expect(() => {
         let moduleInjector = ModuleInjector.createAndResolve(MyModule);
         let requestResolver = createResolver(id, data, request, response, moduleInjector);
         let resolvedModule = requestResolver.getResolvedModule(resolvedRoute);
         RequestResolver.getControllerProvider(resolvedModule);
       }).toThrow( /You must define controller within current route: test\/index/g);
     });

  /*
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
           request.emtest("data", a[0]);
           request.emtest("data", a[1]);
           request.emtest("data", a[2]);
           request.emtest("end");
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

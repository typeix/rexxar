import {fakeHttpServer, FakeResponseApi, FakeServerApi} from "../helpers/mocks";
import {Action, Before, Chain, Controller, ErrorMessage, Module} from "..";
import {Request} from "./controller";
import {IAfterConstruct, Inject} from "@typeix/di";
import {HttpMethod, Router, RouterError} from "@typeix/router";
import {BOOTSTRAP_MODULE} from "../decorators/module";
import {Logger} from "@typeix/logger";

describe("fakeHttpServer", () => {

  let server: FakeServerApi;

  beforeEach(() => {

    @Controller({
      name: "core"
    })
    class MyController {

      @Inject(Request)
      private request: Request;


      @Action("error")
      actionError(@ErrorMessage() message: RouterError) {
        return "ERROR=" + message.getMessage() + "=" + this.request.getRoute();
      }


      @Action("fire")
      actionFireError() {
        throw new RouterError(500, "FIRE ERROR CASE", {});
      }

      @Before("index")
      beforeIndex() {
        return "BEFORE";
      }

      @Action("index")
      actionIndex(@Chain() data) {
        return "VALUE <- " + data;
      }

      @Action("call")
      actionAjax() {
        return "CALL=" + this.request.getBody();
      }

      @Action("redirect")
      actionRedirect() {
        return this.request.redirectTo("/mypage", 307);
      }
    }

    @Module({
      name: BOOTSTRAP_MODULE,
      providers: [Logger, Router],
      controllers: [MyController]
    })
    class MyModule implements IAfterConstruct {
      afterConstruct(): void {
        this.router.addRules([
          {
            methods: [HttpMethod.GET, HttpMethod.OPTIONS, HttpMethod.CONNECT, HttpMethod.DELETE, HttpMethod.HEAD, HttpMethod.TRACE],
            url: "/",
            route: "core/index"
          },
          {
            methods: [HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH],
            url: "/ajax/call",
            route: "core/call"
          },
          {
            methods: [HttpMethod.GET],
            url: "/redirect",
            route: "core/redirect"
          },
          {
            methods: [HttpMethod.GET],
            url: "/fire-error",
            route: "core/fire"
          }
        ]);
        this.router.setError("core/error");
      }

      @Inject(Router)
      private router: Router;
    }

    server = fakeHttpServer(MyModule);
  });


  it("Should do GET redirect", (done) => {
    server.GET("/redirect").then((api: FakeResponseApi) => {
      expect(api.getStatusCode()).toBe(307);
      expect(api.getHeaders()).toEqual({"Location": "/mypage"});
      done();
    }).catch(done);
  });

  it("Should do GET found error", (done) => {
    server.GET("/fire-error").then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toContain("ERROR=FIRE ERROR CASE");
      expect(api.getStatusCode()).toBe(500);
      done();
    }).catch(done);
  });


  it("Should do GET not found", (done) => {
    server.GET("/abc").then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toContain("ERROR=Router.parseRequest: /abc no route found, method: GET");
      expect(api.getStatusCode()).toBe(404);
      done();
    }).catch(done);
  });

  it("Should do GET index", (done) => {
    server.GET("/").then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toBe("VALUE <- BEFORE");
      expect(api.getStatusCode()).toBe(200);
      done();
    }).catch(done);
  });

  it("Should do OPTIONS index", (done) => {
    server.OPTIONS("/").then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toBe("VALUE <- BEFORE");
      expect(api.getStatusCode()).toBe(200);
      done();
    }).catch(done);
  });

  it("Should do CONNECT index", (done) => {
    server.CONNECT("/").then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toBe("VALUE <- BEFORE");
      done();
    }).catch(done);
  });

  it("Should do DELETE index", (done) => {
    server.DELETE("/").then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toBe("VALUE <- BEFORE");
      done();
    }).catch(done);
  });

  it("Should do HEAD index", (done) => {
    server.HEAD("/").then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toBe("VALUE <- BEFORE");
      done();
    }).catch(done);
  });

  it("Should do TRACE index", (done) => {
    server.TRACE("/").then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toBe("VALUE <- BEFORE");
      done();
    }).catch(done);
  });

  it("Should do POST index", (done) => {
    server.POST("/ajax/call", Buffer.from("SENT_FROM_CLIENT")).then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toBe("CALL=SENT_FROM_CLIENT");
      done();
    }).catch(done);
  });

  it("Should do PUT index", (done) => {
    server.PUT("/ajax/call", Buffer.from("SENT_FROM_CLIENT")).then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toBe("CALL=SENT_FROM_CLIENT");
      done();
    }).catch(done);
  });

  it("Should do PATCH index", (done) => {
    server.PATCH("/ajax/call", Buffer.from("SENT_FROM_CLIENT")).then((api: FakeResponseApi) => {
      expect(api.getBody().toString()).toBe("CALL=SENT_FROM_CLIENT");
      done();
    }).catch(done);
  });


});

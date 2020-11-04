import {Action, Controller, Produces, RootModule} from "../decorators";
import {IAfterConstruct, Inject} from "@typeix/di";
import {HttpMethod, Router} from "@typeix/router";
import {LOGGER, Request} from "../";
import {
  APIGatewayProxyEvent
} from "aws-lambda";
import {
  APIGatewayEventDefaultAuthorizerContext, APIGatewayEventIdentity,
  APIGatewayEventRequestContextWithAuthorizer
} from "aws-lambda/common/api-gateway";
import {lambdaServer} from "./lambda";
import {LambdaEvent} from "../decorators/lambda";
import * as log4js from "log4js";


describe("fakeHttpServer", () => {

  let handler: Function;

  let identity: APIGatewayEventIdentity = {
    cognitoIdentityPoolId: null,
    accountId: null,
    cognitoIdentityId: null,
    caller: null,
    sourceIp: "1.1.1.1",
    principalOrgId: null,
    accessKey: null,
    cognitoAuthenticationType: null,
    cognitoAuthenticationProvider: null,
    userArn: null,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36 Edg/81.0.416.68",
    user: null,
    apiKey: null,
    apiKeyId: null
  }
  let requestContext: APIGatewayEventRequestContextWithAuthorizer<APIGatewayEventDefaultAuthorizerContext> = {
    accountId: "111122223333",
    apiId: "ibpv70npw6",
    protocol: "HTTP/1.1",
    httpMethod: "GET",
    path: "/v1",
    stage: "v1",
    requestId: "b25e63dd-c0a8-4691-8b2a-5d152c9ec6aa",
    requestTimeEpoch: 1588437422229,
    resourceId: "tfcr3vy1c1",
    resourcePath: "/",
    identity: identity,
    authorizer: {}
  };
  let event: APIGatewayProxyEvent = {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: {
      "a": [
        "1",
        "2"
      ],
      "b": [
        "1",
        "2"
      ],
      "c": [
        "1",
        "2"
      ]
    },
    stageVariables: null,
    resource: "/",
    requestContext: requestContext
  };

  beforeEach(() => {

    let lambdaEvent;

    @Controller({
      name: "core"
    })
    class MyController {

      @Inject(Request)
      private request: Request;

      @LambdaEvent()
      private event: APIGatewayProxyEvent;

      @Produces("application/json")
      @Action("index")
      actionIndex() {
        return this.event;
      }

      @Produces("application/json")
      @Action("property")
      actionProperty(@LambdaEvent() event) {
        return event;
      }
    }


    @RootModule({
      providers: [
        {
          provide: LOGGER,
          useFactory: () => {
            return log4js.configure({
              appenders: {
                out: { type: 'stdout', layout: { type: 'json', separator: ',' } }
              },
              categories: {
                default: { appenders: ['out'], level: 'info' }
              }
            }).getLogger();
          }
        },
        Router
      ],
      controllers: [MyController]
    })
    class MyModule implements IAfterConstruct {
      afterConstruct(): void {
        this.router.addRules([
          {
            methods: [HttpMethod.GET],
            url: "/",
            route: "core/index"
          },
          {
            methods: [HttpMethod.GET],
            url: "/property",
            route: "core/property"
          }
        ]);
      }

      @Inject(LOGGER)
      private logger: log4js.Logger;

      @Inject(Router)
      private router: Router;
    }

    handler = lambdaServer(MyModule);
  });


  it("Api Gateway Check core/index", (done) => {
    let context = {};
    handler(event, context, (error, data) => {
      expect(data.body).toEqual(JSON.stringify(event));
      expect(data.statusCode).toBe(200);
      done();
    }).catch(done);
  });


  it("Api Gateway Check core/property", (done) => {
    let context = {};
    let cEvent = Object.assign(event, {path: "/property"});
    expect(cEvent.path).toBe("/property");
    handler(cEvent, context, (error, data) => {
      expect(data.body).toEqual(JSON.stringify(cEvent));
      expect(data.statusCode).toBe(200);
      done();
    }).catch(done);
  });


  it("Api Gateway Error Check", (done) => {
    let context = {};
    let cEvent = Object.assign(event, {path: "/not-found"});
    handler(cEvent, context, (error, data) => {
      expect({
        "body": "Error: Router.parseRequest: /not-found no route found, method: GET",
        "headers": {
          "Content-Type": "text/html"
        },
        "statusCode": 404
      }).toEqual({body: data.body.split("\n").shift(), headers: data.headers, statusCode: data.statusCode});
      expect(data.statusCode).toBe(404);
      done();
    }).catch(done);
  });

});

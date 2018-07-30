import {IFilter} from "./interfaces";
import {Filter} from "./decorators";

describe("@Decorators", () => {

  test("@Filter", () => {

    @Filter(100)
    class MyFilter implements IFilter{
      after(data: string | Buffer): string | Buffer | Promise<string | Buffer> {
        return undefined;
      }

      before(data: string | Buffer): string | Buffer | Promise<string | Buffer> {
        return undefined;
      }

    }
  });
});

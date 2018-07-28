import {Filter} from "./decorators/filter";
import {IFilter} from "./interfaces";

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
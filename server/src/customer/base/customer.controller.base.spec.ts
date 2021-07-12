import { Test } from "@nestjs/testing";
import { INestApplication, HttpStatus, ExecutionContext } from "@nestjs/common";
import request from "supertest";
import { MorganModule } from "nest-morgan";
import { ACGuard } from "nest-access-control";
import { BasicAuthGuard } from "../../auth/basicAuth.guard";
import { ACLModule } from "../../auth/acl.module";
import { CustomerController } from "../customer.controller";
import { CustomerService } from "../customer.service";

const nonExistingId = "nonExistingId";
const existingId = "existingId";
const CREATE_INPUT = {
  birthday: new Date(),
  createdAt: new Date(),
  email: "exampleEmail",
  firstName: "exampleFirstName",
  id: "exampleId",
  lastName: "exampleLastName",
  phone: "examplePhone",
  updatedAt: new Date(),
};
const CREATE_RESULT = {
  birthday: new Date(),
  createdAt: new Date(),
  email: "exampleEmail",
  firstName: "exampleFirstName",
  id: "exampleId",
  lastName: "exampleLastName",
  phone: "examplePhone",
  updatedAt: new Date(),
};
const FIND_MANY_RESULT = [
  {
    birthday: new Date(),
    createdAt: new Date(),
    email: "exampleEmail",
    firstName: "exampleFirstName",
    id: "exampleId",
    lastName: "exampleLastName",
    phone: "examplePhone",
    updatedAt: new Date(),
  },
];
const FIND_ONE_RESULT = {
  birthday: new Date(),
  createdAt: new Date(),
  email: "exampleEmail",
  firstName: "exampleFirstName",
  id: "exampleId",
  lastName: "exampleLastName",
  phone: "examplePhone",
  updatedAt: new Date(),
};

const service = {
  create() {
    return CREATE_RESULT;
  },
  findMany: () => FIND_MANY_RESULT,
  findOne: ({ where }: { where: { id: string } }) => {
    switch (where.id) {
      case existingId:
        return FIND_ONE_RESULT;
      case nonExistingId:
        return null;
    }
  },
};

const basicAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    const argumentHost = context.switchToHttp();
    const request = argumentHost.getRequest();
    request.user = {
      roles: ["user"],
    };
    return true;
  },
};

const acGuard = {
  canActivate: () => {
    return true;
  },
};

describe("Customer", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: CustomerService,
          useValue: service,
        },
      ],
      controllers: [CustomerController],
      imports: [MorganModule.forRoot(), ACLModule],
    })
      .overrideGuard(BasicAuthGuard)
      .useValue(basicAuthGuard)
      .overrideGuard(ACGuard)
      .useValue(acGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  test("POST /customers", async () => {
    await request(app.getHttpServer())
      .post("/customers")
      .send(CREATE_INPUT)
      .expect(HttpStatus.CREATED)
      .expect({
        ...CREATE_RESULT,
        birthday: CREATE_RESULT.birthday.toISOString(),
        createdAt: CREATE_RESULT.createdAt.toISOString(),
        updatedAt: CREATE_RESULT.updatedAt.toISOString(),
      });
  });

  test("GET /customers", async () => {
    await request(app.getHttpServer())
      .get("/customers")
      .expect(HttpStatus.OK)
      .expect([
        {
          ...FIND_MANY_RESULT[0],
          birthday: FIND_MANY_RESULT[0].birthday.toISOString(),
          createdAt: FIND_MANY_RESULT[0].createdAt.toISOString(),
          updatedAt: FIND_MANY_RESULT[0].updatedAt.toISOString(),
        },
      ]);
  });

  test("GET /customers/:id non existing", async () => {
    await request(app.getHttpServer())
      .get(`${"/customers"}/${nonExistingId}`)
      .expect(404)
      .expect({
        statusCode: 404,
        message: `No resource was found for {"${"id"}":"${nonExistingId}"}`,
        error: "Not Found",
      });
  });

  test("GET /customers/:id existing", async () => {
    await request(app.getHttpServer())
      .get(`${"/customers"}/${existingId}`)
      .expect(HttpStatus.OK)
      .expect({
        ...FIND_ONE_RESULT,
        birthday: FIND_ONE_RESULT.birthday.toISOString(),
        createdAt: FIND_ONE_RESULT.createdAt.toISOString(),
        updatedAt: FIND_ONE_RESULT.updatedAt.toISOString(),
      });
  });

  afterAll(async () => {
    await app.close();
  });
});

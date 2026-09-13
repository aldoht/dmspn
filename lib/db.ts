import snowflake, { Binds } from "snowflake-sdk";

declare global {
  // eslint-disable-next-line no-var
  var __snowflakeConnection: snowflake.Connection | undefined;
  // eslint-disable-next-line no-var
  var __snowflakeConnectPromise: Promise<snowflake.Connection> | undefined;
}

function createConnection() {
  return snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    password: process.env.SNOWFLAKE_PASSWORD!,
    database: "DMSPN",
    schema: "COMPLIANCE",
    warehouse: "COMPUTE_WH",
    role: process.env.SNOWFLAKE_ROLE!,
  });
}

const connection = global.__snowflakeConnection ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  global.__snowflakeConnection = connection;
}

function connect(): Promise<snowflake.Connection> {
  if (!global.__snowflakeConnectPromise) {
    global.__snowflakeConnectPromise = new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) {
          console.error("Unable to connect to Snowflake:", err.message);
          global.__snowflakeConnectPromise = undefined;
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
  }
  return global.__snowflakeConnectPromise;
}

export async function executeQuery<T = unknown>(
  sqlText: string,
  binds: Binds | undefined = [],
): Promise<T[]> {
  await connect();

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, _stmt, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve((rows ?? []) as T[]);
        }
      },
    });
  });
}

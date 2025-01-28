import AWS, { DynamoDB } from "aws-sdk";
import { ChildProcess } from "child_process";
import { parse } from "csv-parse/sync";
import DDBLocal from "dynamodb-local";
import * as fs from "fs";

const DynamoDbLocal = require("dynamodb-local");
const dynamoLocalPort = 8000;

const ddbPort = Number(process.env.DYNAMODB_LOCAL_PORT || 8009);
// DynamoDB runs on 127.0.0.1, *not* on localhost (which may resolve to ::1, eg on GitHub runners).
const ddbEndpoint = `127.0.0.1:${ddbPort}`;
const ddbConfig = {
  //   endpoint: ddbEndpoint,
  //   sslEnabled: false,
  //   region: "local",
  region: "us-east-2", // e.g., "us-east-1"
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
    sessionToken: "",
  },
};

let ddbInstance: ChildProcess | undefined;
(global as any)["__DYNAMODB_LOCAL__"] = true;

/** Overrides the default config to use the local instance of DynamoDB in tests. */
export const ddbConnectionSetup = () => {
  Object.assign(AWS.config, ddbConfig);
};

const tokenProtectionTable = {
  TableName: "TokenProtection",
  KeySchema: [
    {
      AttributeName: "tokenId",
      KeyType: "HASH",
    },
  ],
  AttributeDefinitions: [
    {
      AttributeName: "tokenId",
      AttributeType: "S",
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  },
};

const createTable = async (table: DynamoDB.Types.CreateTableInput) => {
  const ddb = getDdbOrDie();

  await ddb.createTable(table).promise();
};

const getDdbOrDie = (): DynamoDB => {
  const ddb = (global as any)["__DYNAMODB_CLIENT__"] as DynamoDB;

  if (ddb === undefined) {
    throw new Error();
  }

  return ddb;
};

async function launchDynamoDbLocal() {
  console.log("Starting DynamoDB");
  ddbInstance = await DDBLocal.launch(ddbPort, null);
  console.log("Started DynamoDB");

  ddbConnectionSetup();
  (global as any)["__DYNAMODB_CLIENT__"] = new DynamoDB(ddbConfig);
}

interface TokenProtectionInfo {
  tokenId: string;
  __en: string;
  chainId: number;
  result: string;
  address: string;
  attackTypes: string[];
  updatedAt: number;
}

function mapDynamoDBToTokenProtectionInfo(
  dynamoItem: any
): TokenProtectionInfo {
  return {
    tokenId: dynamoItem.tokenId.S,
    __en: dynamoItem.__en.S,
    chainId: Number(dynamoItem.chainId.N),
    result: dynamoItem.result.S,
    address: dynamoItem.address.S,
    attackTypes: dynamoItem.attackTypes.L.map((item: any) => item.S),
    updatedAt: Number(dynamoItem.updatedAt.N),
  };
}

const NAME_TO_CHAINID_MAP: Record<string, number> = {
  ARBITRUM: 42161,
  AVALANCHE: 43114,
  BASE: 8453,
  BLAST: 81457,
  "BINANCE SMART CHAIN": 56,
  ETHEREUM: 1,
  OPTIMISM: 10,
  POLYGON: 137,
  ZKSYNC: 324,
};

async function main() {
  ddbConnectionSetup();
  let ddb = new DynamoDB.DocumentClient(ddbConfig);

  const content = fs.readFileSync(`${process.cwd()}/src/input.csv`, {
    encoding: "utf-8",
  });

  const records = parse(content, { columns: true });
  console.log(records.length);
  const outputStream = fs.createWriteStream(
    `${process.cwd()}/src/output-remote.csv`
  );
  const unprocessedStream = fs.createWriteStream(
    `${process.cwd()}/src/output-remote-unprocessed.csv`
  );
  outputStream.write("chain,address,result,attackTypes\n");
  let count = 0;

  const BATCH_SIZE = 25;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchKeys = batch.map((record: any) => ({
      tokenId: `${NAME_TO_CHAINID_MAP[record.chain.toUpperCase()]}_${
        record.token_address
      }`,
    }));

    const result: any = await ddb
      .batchGet({
        RequestItems: {
          "prod-us-east-2-DataGraphQLAPIAPI-TokenProtection2FB40263-1OJM77864O9BO":
            {
              Keys: batchKeys,
            },
        },
      })
      .promise();

    for (const item of result.Responses[
      "prod-us-east-2-DataGraphQLAPIAPI-TokenProtection2FB40263-1OJM77864O9BO"
    ]) {
      outputStream.write(
        `${item.chainId},${item.address},${item.result},${item.attackTypes}\n`
      );
    }

    if (Object.keys(result.UnprocessedKeys).length > 0) {
      unprocessedStream.write(JSON.stringify(result.UnprocessedKeys));
    }

    console.log(`Processed ${i}`);
    await sleep(200);
  }
}

main().then(() => {
  console.log("done");
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

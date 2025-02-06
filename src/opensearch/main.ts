import axios from "axios";
import { OpensearchClient } from "./OpenSearchClient";
import { OpensearchHelper } from "./OpenSearchHelper";
import aws4Interceptor from "aws4-axios";
import dotenv from "dotenv";

async function main() {
  const axiosClient = axios.create();
  const interceptor = aws4Interceptor({
    options: {
      region: "us-east-2",
      service: "es",
    },
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
      sessionToken: process.env.SESSION_TOKEN!,
    },
  });
  axiosClient.interceptors.request.use(interceptor);

  const client = new OpensearchClient({
    axiosClient,
  });

  const result = await client.search({
    data: OpensearchHelper.constructSearchByTextBody("usd", "VERIFIED"),
  });

  console.log(result);
}

main().then(() => {
  console.log("done");
});

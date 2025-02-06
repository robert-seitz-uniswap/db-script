import axios, { AxiosInstance } from "axios";
import { TokenDbItem } from "./types";

export const newAbortSignal = (timeoutMs: number): AbortSignal => {
  const abortController = new AbortController();
  setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  return abortController.signal;
};

export enum OpensearchIndex {
  TOKENS = "tokens",
}

export enum OpensearchType {
  DOC = "_doc",
  SEARCH = "_search",
}

const OPENSEARCH_HOST =
  "search-searchdomainfdc-kbdrascuhxfw-3xyk36pktkk62utsj2ovvexsra.us-east-2.es.amazonaws.com";
export const OPENSEARCH_TOKEN_DOC_URL = `https://${OPENSEARCH_HOST}/${OpensearchIndex.TOKENS}/${OpensearchType.DOC}`;
export const OPENSEARCH_TOKEN_SEARCH_URL = `https://${OPENSEARCH_HOST}/${OpensearchIndex.TOKENS}/${OpensearchType.SEARCH}`;

export interface OpensearchClientConstructorProps {
  axiosClient: AxiosInstance;
}

export const OPENSEARCH_CLIENT_TIMEOUT_MS = 5_000;

export class OpensearchClient {
  private axiosClient: AxiosInstance;

  constructor(props: OpensearchClientConstructorProps) {
    this.axiosClient = props.axiosClient;
  }

  public async delete(tokenId: string): Promise<void> {
    await this.axiosClient.delete(`${OPENSEARCH_TOKEN_DOC_URL}/${tokenId}`);
  }

  public async put(tokenId: string, document: any) {
    await this.axiosClient.put(
      `${OPENSEARCH_TOKEN_DOC_URL}/${tokenId}`,
      document
    );
  }

  // We directly put TokenDbItem records into our OpenSearch index when our
  // TokensTable receives updates, so that is the type we get back from
  // OpenSearch when we query. This will later by transformed to type Token in
  // the processor.
  public async search(searchBody: {
    data: { [key: string]: any };
  }): Promise<TokenDbItem[]> {
    const endpoint = "Search";
    try {
      const result = await this.axiosClient.get(OPENSEARCH_TOKEN_SEARCH_URL, {
        ...searchBody,
        timeout: OPENSEARCH_CLIENT_TIMEOUT_MS,
        signal: newAbortSignal(OPENSEARCH_CLIENT_TIMEOUT_MS),
      });
      //   const successMetric = powertoolsMetric.singleMetric();
      //   successMetric.addDimensions({ endpoint });
      //   successMetric.addMetric(
      //     MetricName.OpensearchSuccess,
      //     MetricUnits.Count,
      //     1
      //   );
      return result.data.hits.hits.map((hit: any) => {
        return hit._source as TokenDbItem;
      });
    } catch (error: any) {
      // Some information regarding OpenSearch error codes:
      // https://docs.aws.amazon.com/opensearch-service/latest/APIReference/CommonErrors.html
      //
      // If there are no hits, the status code should still be 200.
      const errorStatus =
        axios.isAxiosError(error) && error.response?.status
          ? error.response!.status
          : 500;
      //   const errorMetric = powertoolsMetric.singleMetric();
      //   errorMetric.addDimensions({ status: errorStatus.toString(), endpoint });
      //   errorMetric.addMetric(MetricName.OpensearchError, MetricUnits.Count, 1);
      throw error;
    } finally {
      //   const requestCountMetric = powertoolsMetric.singleMetric();
      //   requestCountMetric.addDimensions({ endpoint });
      //   requestCountMetric.addMetric(
      //     MetricName.OpensearchRequestCount,
      //     MetricUnits.Count,
      //     1
      //   );
    }
  }
}

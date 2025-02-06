// import { SafetyLevel } from "../../../../types/graphql";

export class OpensearchHelper {
  // constructs a request body for for searching tokens with fuzzy matching
  public static constructSearchByTextBody(
    searchQuery: string,
    safetyLevel: any //SafetyLevel
  ): { [key: string]: any } {
    return {
      size: 100,
      query: {
        // the record should strictly match with the prefix, on either `symbol`, `name`, or `projectName`.
        bool: {
          should: [
            {
              match_phrase_prefix: {
                symbol: {
                  query: searchQuery,
                  // favor a match on symbol.
                  boost: 10,
                },
              },
            },
            {
              match_phrase_prefix: {
                name: {
                  query: searchQuery,
                },
              },
            },
            {
              match_phrase_prefix: {
                projectName: {
                  query: searchQuery,
                },
              },
            },
          ],
          must: [
            // {
            //   match: {
            //     safetyLevel,
            //   },
            // },
            {
              match: {
                chainId: 130,
              },
            },
          ],
          minimum_should_match: 0,
        },
      },
      sort: {
        // tokens missing volume will be placed at last (by default OpenSearch config)
        volume: {
          order: "desc",
        },
      },
    };
  }

  public static constructSearchByAddressBody(address: string): {
    [key: string]: any;
  } {
    return {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: address,
                fields: ["address"],
              },
            },
          ],
        },
      },
    };
  }
}

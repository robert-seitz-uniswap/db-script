// import { TokenProtectionInfoEntity } from "../graphql/models/TokenProtectionInfoEntity";

export interface BridgeInfo {
  [chainName: string]: {
    tokenAddress: string;
  };
}

export enum SpamCode {
  NOT_SPAM = 0,
  SPAM = 1,
  SPAM_URL = 2,
}

export interface FeeData {
  buyFeeBps?: string;
  sellFeeBps?: string;
  feeTakenOnTransfer?: boolean;
  externalTransferFailed?: boolean;
  sellReverted?: boolean;
}

export interface TokenDbItem {
  tokenId: string;
  chainId: number;
  address: string;
  symbol?: string;
  name?: string;
  standard?: string;
  projectName?: string;
  decimals?: number;
  logoUrl?: string;
  description?: string;
  descriptionTranslations?: Record<string, string>;
  homepageUrl?: string;
  twitterName?: string;
  volume?: number;
  isSpam?: string;
  safetyLevel?: string;
  bridgeInfo?: BridgeInfo;
  lastSourced?: number;
  lastAudited?: number;
  spamCode?: SpamCode;
  feeData?: FeeData;
  protectionInfo?: any; //TokenProtectionInfoEntity;
}

export enum RankingType {
  TOTAL_VALUE_LOCKED = "TOTAL_VALUE_LOCKED",
  MARKET_CAP = "MARKET_CAP",
  VOLUME = "VOLUME",
  POPULARITY = "POPULARITY",
}

export interface RankingDbItem {
  listId: string;
  rank: number;
  lastUpdated: number;
  chainId: number;
  rankingType: string;
  address?: string;
}

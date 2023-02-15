import { ChainId } from "../../enums/chain-id";
import { WBNB } from "./wbnb";

/**
 * BNB token context
 */
export class BNB {
  /**
   * Get BNB token info
   */
  public static token() {
    return {
      chainId: ChainId.BSC,
      contractAddress: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
      decimals: 18,
      symbol: "BNB",
      name: "Binance Chain Native Token",
      wrappedToken: WBNB.token(),
    };
  }
}

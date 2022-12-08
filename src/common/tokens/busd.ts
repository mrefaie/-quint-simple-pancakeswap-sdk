import { ChainId } from "../../enums/chain-id";

/**
 * BUSD token context
 */
export class BUSD {
  /**
   * Get BUSD token info
   */
  public static token() {
    return {
      chainId: ChainId.BSC,
      contractAddress: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
      decimals: 18,
      symbol: "BUSD",
      name: "Binance-Peg",
    };
  }
}

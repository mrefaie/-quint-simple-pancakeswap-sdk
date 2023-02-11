import { ChainId } from "../../enums/chain-id";
/**
 * BNB token context
 */
export declare class WBNB {
    /**
     * Get BNB token info
     */
    static token(): {
        chainId: ChainId;
        contractAddress: string;
        decimals: number;
        symbol: string;
        name: string;
    };
}

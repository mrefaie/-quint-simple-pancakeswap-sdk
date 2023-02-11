import { ChainId } from "../../enums/chain-id";
/**
 * BUSD token context
 */
export declare class BUSD {
    /**
     * Get BUSD token info
     */
    static token(): {
        chainId: ChainId;
        contractAddress: string;
        decimals: number;
        symbol: string;
        name: string;
    };
}

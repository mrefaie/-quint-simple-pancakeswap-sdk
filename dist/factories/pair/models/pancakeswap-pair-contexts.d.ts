import { PancakeswapPairSettings } from "./pancakeswap-pair-settings";
export interface PancakeswapPairContext {
    fromTokenContractAddress: string;
    toTokenContractAddress: string;
    ethereumAddress: string;
    isETH: boolean;
    providerUrl?: string | undefined;
    settings?: PancakeswapPairSettings | undefined;
}

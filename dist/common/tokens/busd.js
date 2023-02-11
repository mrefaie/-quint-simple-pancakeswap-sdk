"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUSD = void 0;
const chain_id_1 = require("../../enums/chain-id");
/**
 * BUSD token context
 */
class BUSD {
    /**
     * Get BUSD token info
     */
    static token() {
        return {
            chainId: chain_id_1.ChainId.BSC,
            contractAddress: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
            decimals: 18,
            symbol: "BUSD",
            name: "Binance-Peg",
        };
    }
}
exports.BUSD = BUSD;

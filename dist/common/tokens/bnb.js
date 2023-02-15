"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BNB = void 0;
const chain_id_1 = require("../../enums/chain-id");
const wbnb_1 = require("./wbnb");
/**
 * BNB token context
 */
class BNB {
    /**
     * Get BNB token info
     */
    static token() {
        return {
            chainId: chain_id_1.ChainId.BSC,
            contractAddress: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
            decimals: 18,
            symbol: "BNB",
            name: "Binance Chain Native Token",
            wrappedToken: wbnb_1.WBNB.token(),
        };
    }
}
exports.BNB = BNB;

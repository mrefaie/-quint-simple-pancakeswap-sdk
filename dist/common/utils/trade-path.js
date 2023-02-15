"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTradePath = void 0;
const trade_path_1 = require("../../enums/trade-path");
const tokens_1 = require("../tokens");
function getTradePath(fromToken, toToken, isETH = false) {
    if (fromToken.contractAddress === tokens_1.WBNB.token().contractAddress && isETH) {
        return trade_path_1.TradePath.ethToErc20;
    }
    if (toToken.contractAddress === tokens_1.WBNB.token().contractAddress && isETH) {
        return trade_path_1.TradePath.erc20ToEth;
    }
    return trade_path_1.TradePath.erc20ToErc20;
}
exports.getTradePath = getTradePath;

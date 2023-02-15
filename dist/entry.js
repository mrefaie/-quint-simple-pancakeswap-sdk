"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
const handler = () => __awaiter(void 0, void 0, void 0, function* () {
    const pancakeSwapPair = new _1.PancakeswapPair({
        fromTokenContractAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        toTokenContractAddress: "0x64619f611248256F7F4b72fE83872F89d5d60d64",
        ethereumAddress: "0xc5A9BE8CD8dE39C9197E5CaD1A460184100d92b1",
        settings: new _1.PancakeswapPairSettings({
            slippage: 2 / 100,
            deadlineMinutes: 10,
            disableMultihops: false,
        }),
        isETH: true,
    });
    const pairFactory = yield pancakeSwapPair.createFactory();
    console.log(yield pairFactory.tradeExactOutput("1040"));
});
handler();

import { TradePath } from "../../enums/trade-path";
import { Token } from "../../factories/token/models/token";
import { WBNB } from "../tokens";

export function getTradePath(
  fromToken: Token,
  toToken: Token,
  isETH: boolean = false
): TradePath {
  if (fromToken.contractAddress === WBNB.token().contractAddress && isETH) {
    return TradePath.ethToErc20;
  }

  if (toToken.contractAddress === WBNB.token().contractAddress && isETH) {
    return TradePath.erc20ToEth;
  }

  return TradePath.erc20ToErc20;
}

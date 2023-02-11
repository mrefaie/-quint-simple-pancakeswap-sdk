import { ContractCallContext, Multicall } from "ethereum-multicall";
import { ContractContext } from "../../common/contract-context";
import { ErrorCodes } from "../../common/errors/error-codes";
import { PancakeswapError } from "../../common/errors/pancakeswap-error";
import { BNB } from "../../common/tokens";
import { EthersProvider } from "../../ethers-provider";
import { Token } from "./models/token";

export class TokensFactory {
  private _multicall = new Multicall({
    ethersProvider: this._ethersProvider.provider,
  });

  constructor(private _ethersProvider: EthersProvider) {}

  /**
   * Get the tokens details
   */
  public async getTokens(tokenContractAddresses: string[]): Promise<Token[]> {
    try {
      const SYMBOL = 0;
      const DECIMALS = 1;
      const NAME = 2;

      const tokens: Token[] = [];

      const contractCallContexts: ContractCallContext[] = [];
      for (let i = 0; i < tokenContractAddresses.length; i++) {
        if (
          tokenContractAddresses[i].toLowerCase() ===
          BNB.token().contractAddress.toLowerCase()
        ) {
          tokens.push(BNB.token());
          continue;
        }
        const contractCallContext: ContractCallContext = {
          reference: `token${i}`,
          contractAddress: tokenContractAddresses[i],
          abi: ContractContext.erc20Abi,
          calls: [
            {
              reference: `symbol`,
              methodName: "symbol",
              methodParameters: [],
            },
            {
              reference: `decimals`,
              methodName: "decimals",
              methodParameters: [],
            },
            {
              reference: `name`,
              methodName: "name",
              methodParameters: [],
            },
          ],
        };

        contractCallContexts.push(contractCallContext);
      }

      const contractCallResults = await this._multicall.call(
        contractCallContexts
      );

      for (const result in contractCallResults.results) {
        const tokenInfo = contractCallResults.results[result];

        tokens.push({
          chainId: this._ethersProvider.network().chainId,
          contractAddress:
            tokenInfo.originalContractCallContext.contractAddress,
          symbol: tokenInfo.callsReturnContext[SYMBOL].returnValues[0],
          decimals: tokenInfo.callsReturnContext[DECIMALS].returnValues[0],
          name: tokenInfo.callsReturnContext[NAME].returnValues[0],
        });
      }

      return tokens;
    } catch (error) {
      throw new PancakeswapError(
        "invalid from or to contract tokens",
        ErrorCodes.invalidFromOrToContractToken
      );
    }
  }
}

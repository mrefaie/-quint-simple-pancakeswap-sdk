import BigNumber from "bignumber.js";
import { Subject } from "rxjs";
import { PancakeswapError } from "../..";
import { Constants } from "../../common/constants";
import { ContractContext } from "../../common/contract-context";
import { ErrorCodes } from "../../common/errors/error-codes";
import { hexlify } from "../../common/utils/hexlify";
import { parseEther } from "../../common/utils/parse-ether";
import { toEthersBigNumber } from "../../common/utils/to-ethers-big-number";
import { getTradePath } from "../../common/utils/trade-path";
import { TradePath } from "../../enums/trade-path";
import { BestRouteQuotes } from "../router/models/best-route-quotes";
import { RouteQuote } from "../router/models/route-quote";
import { PancakeswapRouterContractFactory } from "../router/pancakeswap-router-contract.factory";
import { PancakeswapRouterFactory } from "../router/pancakeswap-router.factory";
import { AllowanceAndBalanceOf } from "../token/models/allowance-balance-of";
import { Token } from "../token/models/token";
import { TokenFactory } from "../token/token.factory";
import { PancakeswapPairFactoryContext } from "./models/pancakeswap-pair-factory-context";
import { TradeContext } from "./models/trade-context";
import { Transaction } from "./models/transaction";
import { PancakeswapPairContractFactory } from "./pancakeswap-pair-contract.factory";

export class PancakeswapPairFactory {
  private readonly LIQUIDITY_PROVIDER_FEE = 0.003;

  private _fromTokenFactory = new TokenFactory(
    this._pancakeswapPairFactoryContext.fromToken.contractAddress,
    this._pancakeswapPairFactoryContext.ethersProvider
  );

  private _pancakeswapRouterContractFactory =
    new PancakeswapRouterContractFactory(
      this._pancakeswapPairFactoryContext.ethersProvider
    );

  private _pancakeswapPairFactory = new PancakeswapPairContractFactory(
    this._pancakeswapPairFactoryContext.ethersProvider
  );

  private _pancakeswapRouterFactory = new PancakeswapRouterFactory(
    this._pancakeswapPairFactoryContext.fromToken.wrappedToken
      ? this._pancakeswapPairFactoryContext.fromToken.wrappedToken
      : this._pancakeswapPairFactoryContext.fromToken,
    this._pancakeswapPairFactoryContext.toToken.wrappedToken
      ? this._pancakeswapPairFactoryContext.toToken.wrappedToken
      : this._pancakeswapPairFactoryContext.toToken,
    this._pancakeswapPairFactoryContext.settings.disableMultihops,
    this._pancakeswapPairFactoryContext.ethersProvider
  );

  private _quoteChangeTimeout: NodeJS.Timeout | undefined;
  private _quoteChanged$: Subject<TradeContext> = new Subject<TradeContext>();

  constructor(
    private _pancakeswapPairFactoryContext: PancakeswapPairFactoryContext
  ) {}

  /**
   * The to token
   */
  public get toToken(): Token {
    return this._pancakeswapPairFactoryContext.toToken;
  }

  /**
   * The from token
   */
  public get fromToken(): Token {
    return this._pancakeswapPairFactoryContext.fromToken;
  }

  /**
   * Get the contract calls
   */
  public get contractCalls(): PancakeswapPairContractFactory {
    return this._pancakeswapPairFactory;
  }

  /**
   * Execute the trade path
   * @param amount The amount
   */
  private async executeTradePath(amount: BigNumber): Promise<TradeContext> {
    switch (this.tradePath()) {
      case TradePath.erc20ToEth:
        return await this.getTokenTradeAmountErc20ToEth(amount);
      case TradePath.ethToErc20:
        return await this.getTokenTradeAmountEthToErc20(amount);
      case TradePath.erc20ToErc20:
        return await this.getTokenTradeAmountErc20ToErc20(amount);
      default:
        throw new PancakeswapError(
          `${this.tradePath()} is not defined`,
          ErrorCodes.tradePathIsNotSupported
        );
    }
  }

  /**
   * Execute the trade path
   * @param amountOut The amount
   */
  private async executeTradeExactOutputPath(
    amountOut: BigNumber
  ): Promise<TradeContext> {
    switch (this.tradePath()) {
      case TradePath.erc20ToEth:
        return await this.getTokenTradeAmountExactOutputErc20ToEth(amountOut);
      case TradePath.ethToErc20:
        return await this.getTokenTradeAmountExactOutputEthToErc20(amountOut);
      case TradePath.erc20ToErc20:
        return await this.getTokenTradeAmountExactOutputErc20ToErc20(amountOut);
      default:
        throw new PancakeswapError(
          `${this.tradePath()} is not defined`,
          ErrorCodes.tradePathIsNotSupported
        );
    }
  }

  /**
   * Destroy the trade instance watchers + subscriptions
   */
  private destroy(): void {
    for (let i = 0; i < this._quoteChanged$.observers.length; i++) {
      this._quoteChanged$?.observers[i]?.complete();
    }

    if (this._quoteChangeTimeout) {
      clearTimeout(this._quoteChangeTimeout);
    }
  }

  /**
   * Generate trade - this will return amount but you still need to send the transaction
   * if you want it to be executed on the blockchain
   * @amount The amount you want to swap, this is the FROM token amount.
   */
  public async trade(amount: string): Promise<TradeContext> {
    this.destroy();

    const tradeContext: TradeContext = await this.executeTradePath(
      new BigNumber(amount)
    );

    // this.watchTradePrice(tradeContext);

    return tradeContext;
  }

  /**
   * Generate trade - this will return amount but you still need to send the transaction
   * if you want it to be executed on the blockchain
   * @amount The amount you want to swap, this is the FROM token amount.
   */
  public async tradeExactOutput(amountOut: string): Promise<TradeContext> {
    this.destroy();

    const tradeContext: TradeContext = await this.executeTradeExactOutputPath(
      new BigNumber(amountOut)
    );

    // this.watchTradePrice(tradeContext);

    return tradeContext;
  }

  /**
   * Route getter
   */
  private get _routes(): PancakeswapRouterFactory {
    return this._pancakeswapRouterFactory;
  }

  /**
   * Find the best route rate out of all the route quotes
   * @param amountToTrade The amount to trade
   */
  public async findBestRoute(amountToTrade: string): Promise<BestRouteQuotes> {
    return await this._routes.findBestRoute(new BigNumber(amountToTrade));
  }

  /**
   * Find the best route rate out of all the route quotes
   * @param amountToTrade The amount to trade
   */
  public async findAllPossibleRoutesWithQuote(
    amountToTrade: string
  ): Promise<RouteQuote[]> {
    return await this._routes.getAllPossibleRoutesWithQuotes(
      new BigNumber(amountToTrade)
    );
  }

  /**
   * Find all possible routes
   */
  public async findAllPossibleRoutes(): Promise<Token[][]> {
    return await this._routes.getAllPossibleRoutes();
  }

  /**
   * Has got enough allowance to do the trade
   * @param amount The amount you want to swap
   */
  public async hasGotEnoughAllowance(amount: string): Promise<boolean> {
    if (this.tradePath() === TradePath.ethToErc20) {
      return true;
    }

    const allowance = await this.allowance();

    return this._hasGotEnoughAllowance(amount, allowance);
  }

  /**
   * Has got enough allowance to do the trade
   * @param amount The amount you want to swap
   */
  private _hasGotEnoughAllowance(amount: string, allowance: string): boolean {
    if (this.tradePath() === TradePath.ethToErc20) {
      return true;
    }

    const bigNumberAllowance = new BigNumber(allowance).shiftedBy(
      this.fromToken.decimals * -1
    );

    if (new BigNumber(amount).isGreaterThan(bigNumberAllowance)) {
      return false;
    }

    return true;
  }

  /**
   * Has got enough balance to do the trade (erc20 check only)
   * @param amount The amount you want to swap
   */
  private hasGotEnoughBalanceErc20(
    amount: string,
    balance: string
  ): {
    hasEnough: boolean;
    balance: string;
  } {
    const bigNumberBalance = new BigNumber(balance).shiftedBy(
      this.fromToken.decimals * -1
    );

    if (new BigNumber(amount).isGreaterThan(bigNumberBalance)) {
      return {
        hasEnough: false,
        balance: bigNumberBalance.toFixed(),
      };
    }

    return {
      hasEnough: true,
      balance: bigNumberBalance.toFixed(),
    };
  }

  /**
   * Has got enough balance to do the trade (eth check only)
   * @param amount The amount you want to swap
   */
  private async hasGotEnoughBalanceEth(amount: string): Promise<{
    hasEnough: boolean;
    balance: string;
  }> {
    const balance =
      await this._pancakeswapPairFactoryContext.ethersProvider.balanceOf(
        this._pancakeswapPairFactoryContext.ethereumAddress
      );

    const bigNumberBalance = new BigNumber(balance).shiftedBy(
      Constants.ETH_MAX_DECIMALS * -1
    );

    if (new BigNumber(amount).isGreaterThan(bigNumberBalance)) {
      return {
        hasEnough: false,
        balance: bigNumberBalance.toFixed(),
      };
    }

    return {
      hasEnough: true,
      balance: bigNumberBalance.toFixed(),
    };
  }

  /**
   * Get the allowance and balance for the from token (erc20 > blah) only
   */
  public async getAllowanceAndBalanceOfForFromToken(): Promise<AllowanceAndBalanceOf> {
    return await this._fromTokenFactory.getAllowanceAndBalanceOf(
      this._pancakeswapPairFactoryContext.ethereumAddress
    );
  }

  /**
   * Get the allowance for the amount which can be moved from the `fromToken`
   * on the users behalf. Only valid when the `fromToken` is a ERC20 token.
   */
  public async allowance(): Promise<string> {
    if (this.tradePath() === TradePath.ethToErc20) {
      return "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    }

    const allowance = await this._fromTokenFactory.allowance(
      this._pancakeswapPairFactoryContext.ethereumAddress
    );

    return allowance;
  }

  /**
   * Generate the from token approve data max allowance to move the tokens.
   * This will return the data for you to send as a transaction
   */
  public async generateApproveMaxAllowanceData(): Promise<Transaction> {
    if (this.tradePath() === TradePath.ethToErc20) {
      throw new PancakeswapError(
        "You do not need to generate approve pancakeswap allowance when doing eth > erc20",
        ErrorCodes.generateApproveMaxAllowanceDataNotAllowed
      );
    }

    const data = this._fromTokenFactory.generateApproveAllowanceData(
      ContractContext.routerAddress,
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    );

    return {
      to: this.fromToken.contractAddress,
      from: this._pancakeswapPairFactoryContext.ethereumAddress,
      data,
      value: Constants.EMPTY_HEX_STRING,
    };
  }

  /**
   * Get the token trade amount for erc20 > eth
   * @param amount The amount
   */
  private async getTokenTradeAmountErc20ToEth(
    amount: BigNumber
  ): Promise<TradeContext> {
    return await this.findBestPriceAndPathErc20ToEth(amount);
  }

  /**
   * Gets how much token they will get for their trade minus all fees
   * @param ethAmount The eth amount
   */
  private async getTokenTradeAmountEthToErc20(
    ethAmount: BigNumber
  ): Promise<TradeContext> {
    return await this.findBestPriceAndPathEthToErc20(ethAmount);
  }

  /**
   * Get the token trade amount for erc20 > erc20
   * @param amount The amount
   */
  private async getTokenTradeAmountErc20ToErc20(
    amount: BigNumber
  ): Promise<TradeContext> {
    return await this.findBestPriceAndPathErc20ToErc20(amount);
  }

  /**
   * Get the token trade amount for erc20 > eth
   * @param amount The amount
   */
  private async getTokenTradeAmountExactOutputErc20ToEth(
    amount: BigNumber
  ): Promise<TradeContext> {
    return await this.findBestPriceAndPathExactOutputErc20ToEth(amount);
  }

  /**
   * Gets how much token they will get for their trade minus all fees
   * @param ethAmount The eth amount
   */
  private async getTokenTradeAmountExactOutputEthToErc20(
    ethAmount: BigNumber
  ): Promise<TradeContext> {
    return await this.findBestPriceAndPathExactOutputEthToErc20(ethAmount);
  }

  /**
   * Get the token trade amount for erc20 > erc20
   * @param amount The amount
   */
  private async getTokenTradeAmountExactOutputErc20ToErc20(
    amount: BigNumber
  ): Promise<TradeContext> {
    return await this.findBestPriceAndPathExactOutputErc20ToErc20(amount);
  }

  /**
   * finds the best price and path for Erc20ToEth
   * @param amount the erc20Token amount being sent
   */
  private async findBestPriceAndPathErc20ToEth(
    erc20Amount: BigNumber
  ): Promise<TradeContext> {
    const bestRouteQuotes = await this._routes.findBestRoute(erc20Amount);
    const bestRouteQuote = bestRouteQuotes.bestRouteQuote;

    const convertQuoteWithSlippage = new BigNumber(
      bestRouteQuote.expectedConvertQuote
    ).minus(
      new BigNumber(bestRouteQuote.expectedConvertQuote)
        .times(this._pancakeswapPairFactoryContext.settings.slippage)
        .toFixed(this.fromToken.decimals)
    );

    const tradeExpires = this.generateTradeDeadlineUnixTime();

    const data = this.generateTradeDataErc20ToEth(
      erc20Amount,
      convertQuoteWithSlippage,
      bestRouteQuote.routePathArray,
      tradeExpires.toString()
    );

    const allowanceAndBalanceOf =
      await this.getAllowanceAndBalanceOfForFromToken();

    const hasEnoughAllowance = this._hasGotEnoughAllowance(
      erc20Amount.toFixed(),
      allowanceAndBalanceOf.allowance
    );

    const tradeContext: TradeContext = {
      baseConvertRequest: erc20Amount.toFixed(),
      minAmountConvertQuote: convertQuoteWithSlippage.toFixed(
        this.toToken.decimals
      ),
      expectedConvertQuote: bestRouteQuote.expectedConvertQuote,
      liquidityProviderFee: erc20Amount
        .times(this.LIQUIDITY_PROVIDER_FEE)
        .toFixed(this.fromToken.decimals),
      tradeExpires,
      routePathTokenMap: bestRouteQuote.routePathArrayTokenMap,
      routeText: bestRouteQuote.routeText,
      routePath: bestRouteQuote.routePathArray,
      hasEnoughAllowance,
      approvalTransaction: !hasEnoughAllowance
        ? await this.generateApproveMaxAllowanceData()
        : undefined,
      toToken: this.toToken,
      fromToken: this.fromToken,
      fromBalance: this.hasGotEnoughBalanceErc20(
        erc20Amount.toFixed(),
        allowanceAndBalanceOf.balanceOf
      ),
      transaction: this.buildUpTransactionErc20(data),
      allTriedRoutesQuotes: bestRouteQuotes.triedRoutesQuote,
      quoteChanged$: this._quoteChanged$,
      destroy: () => this.destroy(),
    };

    return tradeContext;
  }

  /**
   * finds the best price and path for Erc20ToErc20
   * @param amount the erc20Token amount being sent
   */
  private async findBestPriceAndPathErc20ToErc20(
    erc20Amount: BigNumber
  ): Promise<TradeContext> {
    const bestRouteQuotes = await this._routes.findBestRoute(erc20Amount);
    const bestRouteQuote = bestRouteQuotes.bestRouteQuote;

    const convertQuoteWithSlippage = new BigNumber(
      bestRouteQuote.expectedConvertQuote
    ).minus(
      new BigNumber(bestRouteQuote.expectedConvertQuote)
        .times(this._pancakeswapPairFactoryContext.settings.slippage)
        .toFixed(this.fromToken.decimals)
    );

    const tradeExpires = this.generateTradeDeadlineUnixTime();

    const data = this.generateTradeDataErc20ToErc20(
      erc20Amount,
      convertQuoteWithSlippage,
      bestRouteQuote.routePathArray,
      tradeExpires.toString()
    );

    const allowanceAndBalanceOf =
      await this.getAllowanceAndBalanceOfForFromToken();

    const hasEnoughAllowance = this._hasGotEnoughAllowance(
      erc20Amount.toFixed(),
      allowanceAndBalanceOf.allowance
    );

    const tradeContext: TradeContext = {
      baseConvertRequest: erc20Amount.toFixed(),
      minAmountConvertQuote: convertQuoteWithSlippage.toFixed(
        this.toToken.decimals
      ),
      expectedConvertQuote: bestRouteQuote.expectedConvertQuote,
      liquidityProviderFee: erc20Amount
        .times(this.LIQUIDITY_PROVIDER_FEE)
        .toFixed(this.fromToken.decimals),
      tradeExpires,
      routePathTokenMap: bestRouteQuote.routePathArrayTokenMap,
      routeText: bestRouteQuote.routeText,
      routePath: bestRouteQuote.routePathArray,
      hasEnoughAllowance,
      approvalTransaction: !hasEnoughAllowance
        ? await this.generateApproveMaxAllowanceData()
        : undefined,
      toToken: this.toToken,
      fromToken: this.fromToken,
      fromBalance: this.hasGotEnoughBalanceErc20(
        erc20Amount.toFixed(),
        allowanceAndBalanceOf.balanceOf
      ),
      transaction: this.buildUpTransactionErc20(data),
      allTriedRoutesQuotes: bestRouteQuotes.triedRoutesQuote,
      quoteChanged$: this._quoteChanged$,
      destroy: () => this.destroy(),
    };

    return tradeContext;
  }

  /**
   * Find the best price and route path to take (will round down the slippage)
   * @param ethAmount The eth amount
   */
  private async findBestPriceAndPathEthToErc20(
    ethAmount: BigNumber
  ): Promise<TradeContext> {
    const bestRouteQuotes = await this._routes.findBestRoute(ethAmount);
    const bestRouteQuote = bestRouteQuotes.bestRouteQuote;

    const convertQuoteWithSlippage = new BigNumber(
      bestRouteQuote.expectedConvertQuote
    ).minus(
      new BigNumber(bestRouteQuote.expectedConvertQuote)
        .times(this._pancakeswapPairFactoryContext.settings.slippage)
        .toFixed(this.toToken.decimals)
    );

    const tradeExpires = this.generateTradeDeadlineUnixTime();

    const data = this.generateTradeDataEthToErc20(
      ethAmount,
      convertQuoteWithSlippage,
      bestRouteQuote.routePathArray,
      tradeExpires.toString()
    );

    const tradeContext: TradeContext = {
      baseConvertRequest: ethAmount.toFixed(),
      minAmountConvertQuote: convertQuoteWithSlippage.toFixed(
        this.toToken.decimals
      ),
      expectedConvertQuote: bestRouteQuote.expectedConvertQuote,
      liquidityProviderFee: ethAmount
        .times(this.LIQUIDITY_PROVIDER_FEE)
        .toFixed(this.fromToken.decimals),
      tradeExpires,
      routePathTokenMap: bestRouteQuote.routePathArrayTokenMap,
      routeText: bestRouteQuote.routeText,
      routePath: bestRouteQuote.routePathArray,
      hasEnoughAllowance: true,
      toToken: this.toToken,
      fromToken: this.fromToken,
      fromBalance: await this.hasGotEnoughBalanceEth(ethAmount.toFixed()),
      transaction: this.buildUpTransactionEth(ethAmount, data),
      allTriedRoutesQuotes: bestRouteQuotes.triedRoutesQuote,
      quoteChanged$: this._quoteChanged$,
      destroy: () => this.destroy(),
    };

    return tradeContext;
  }

  /**
   * finds the best price and path for Erc20ToEth
   * @param amount the erc20Token amount being sent
   */
  private async findBestPriceAndPathExactOutputErc20ToEth(
    EthOutputAmount: BigNumber
  ): Promise<TradeContext> {
    const bestRouteQuotes = await this._routes.findBestExactOutputRoute(
      EthOutputAmount
    );
    const bestRouteQuote = bestRouteQuotes.bestRouteQuote;

    const quotedErc20Amount = EthOutputAmount.div(
      bestRouteQuote.expectedConvertQuote
    );

    const quotedErc20AmountWithSlippage = new BigNumber(quotedErc20Amount).plus(
      new BigNumber(quotedErc20Amount)
        .times(this._pancakeswapPairFactoryContext.settings.slippage)
        .toFixed(this.fromToken.decimals)
    );

    const convertQuoteWithSlippage = new BigNumber(EthOutputAmount).div(
      quotedErc20AmountWithSlippage
    );

    const tradeExpires = this.generateTradeDeadlineUnixTime();

    const data = this.generateTradeDataExactOutputErc20ToEth(
      quotedErc20AmountWithSlippage,
      EthOutputAmount,
      bestRouteQuote.routePathArray,
      tradeExpires.toString()
    );

    const allowanceAndBalanceOf =
      await this.getAllowanceAndBalanceOfForFromToken();

    const hasEnoughAllowance = this._hasGotEnoughAllowance(
      quotedErc20Amount.toFixed(),
      allowanceAndBalanceOf.allowance
    );

    const tradeContext: TradeContext = {
      baseConvertRequest: EthOutputAmount.toFixed(),
      minAmountConvertQuote: "0",
      expectedConvertQuote: convertQuoteWithSlippage.toFixed(),
      liquidityProviderFee: quotedErc20AmountWithSlippage
        .times(this.LIQUIDITY_PROVIDER_FEE)
        .toFixed(this.fromToken.decimals),
      tradeExpires,
      routePathTokenMap: bestRouteQuote.routePathArrayTokenMap,
      routeText: bestRouteQuote.routeText,
      routePath: bestRouteQuote.routePathArray,
      hasEnoughAllowance,
      approvalTransaction: !hasEnoughAllowance
        ? await this.generateApproveMaxAllowanceData()
        : undefined,
      toToken: this.toToken,
      fromToken: this.fromToken,
      fromBalance: this.hasGotEnoughBalanceErc20(
        quotedErc20AmountWithSlippage.toFixed(),
        allowanceAndBalanceOf.balanceOf
      ),
      transaction: this.buildUpTransactionErc20(data),
      allTriedRoutesQuotes: bestRouteQuotes.triedRoutesQuote,
      quoteChanged$: this._quoteChanged$,
      destroy: () => this.destroy(),
    };

    return tradeContext;
  }

  /**
   * finds the best price and path for Erc20ToErc20
   * @param amount the erc20Token amount being sent
   */
  private async findBestPriceAndPathExactOutputErc20ToErc20(
    erc20OutputAmount: BigNumber
  ): Promise<TradeContext> {
    const bestRouteQuotes = await this._routes.findBestExactOutputRoute(
      erc20OutputAmount
    );
    const bestRouteQuote = bestRouteQuotes.bestRouteQuote;

    const quotedErc20Amount = erc20OutputAmount.div(
      bestRouteQuote.expectedConvertQuote
    );

    const quotedErc20AmountWithSlippage = new BigNumber(quotedErc20Amount).plus(
      new BigNumber(quotedErc20Amount)
        .times(this._pancakeswapPairFactoryContext.settings.slippage)
        .toFixed(this.fromToken.decimals)
    );

    const convertQuoteWithSlippage = new BigNumber(erc20OutputAmount).div(
      quotedErc20AmountWithSlippage
    );

    const tradeExpires = this.generateTradeDeadlineUnixTime();

    const data = this.generateTradeDataExactOutputErc20ToErc20(
      quotedErc20AmountWithSlippage,
      erc20OutputAmount,
      bestRouteQuote.routePathArray,
      tradeExpires.toString()
    );

    const allowanceAndBalanceOf =
      await this.getAllowanceAndBalanceOfForFromToken();

    const hasEnoughAllowance = this._hasGotEnoughAllowance(
      quotedErc20AmountWithSlippage.toFixed(),
      allowanceAndBalanceOf.allowance
    );

    const tradeContext: TradeContext = {
      baseConvertRequest: erc20OutputAmount.toFixed(),
      minAmountConvertQuote: "0",
      expectedConvertQuote: convertQuoteWithSlippage.toFixed(),
      liquidityProviderFee: quotedErc20AmountWithSlippage
        .times(this.LIQUIDITY_PROVIDER_FEE)
        .toFixed(this.fromToken.decimals),
      tradeExpires,
      routePathTokenMap: bestRouteQuote.routePathArrayTokenMap,
      routeText: bestRouteQuote.routeText,
      routePath: bestRouteQuote.routePathArray,
      hasEnoughAllowance,
      approvalTransaction: !hasEnoughAllowance
        ? await this.generateApproveMaxAllowanceData()
        : undefined,
      toToken: this.toToken,
      fromToken: this.fromToken,
      fromBalance: this.hasGotEnoughBalanceErc20(
        quotedErc20AmountWithSlippage.toFixed(),
        allowanceAndBalanceOf.balanceOf
      ),
      transaction: this.buildUpTransactionErc20(data),
      allTriedRoutesQuotes: bestRouteQuotes.triedRoutesQuote,
      quoteChanged$: this._quoteChanged$,
      destroy: () => this.destroy(),
    };

    return tradeContext;
  }

  /**
   * Find the best price and route path to take (will round down the slippage)
   * @param ethAmount The eth amount
   */
  private async findBestPriceAndPathExactOutputEthToErc20(
    erc20OutputAmount: BigNumber
  ): Promise<TradeContext> {
    const bestRouteQuotes = await this._routes.findBestExactOutputRoute(
      erc20OutputAmount
    );
    const bestRouteQuote = bestRouteQuotes.bestRouteQuote;

    const quotedEthAmount = erc20OutputAmount.div(
      bestRouteQuote.expectedConvertQuote
    );

    const quotedEthAmountWithSlippage = new BigNumber(quotedEthAmount).plus(
      new BigNumber(quotedEthAmount)
        .times(this._pancakeswapPairFactoryContext.settings.slippage)
        .toFixed(this.fromToken.decimals)
    );

    const convertQuoteWithSlippage = new BigNumber(erc20OutputAmount).div(
      quotedEthAmountWithSlippage
    );

    // const convertQuoteWithSlippage = new BigNumber(
    //   bestRouteQuote.expectedConvertQuote
    // ).minus(
    //   new BigNumber(bestRouteQuote.expectedConvertQuote)
    //     .times(this._pancakeswapPairFactoryContext.settings.slippage)
    //     .toFixed(this.toToken.decimals)
    // );

    const tradeExpires = this.generateTradeDeadlineUnixTime();

    const data = this.generateTradeDataExactOutputEthToErc20(
      quotedEthAmountWithSlippage,
      erc20OutputAmount,
      bestRouteQuote.routePathArray,
      tradeExpires.toString()
    );

    const tradeContext: TradeContext = {
      baseConvertRequest: erc20OutputAmount.toFixed(),
      minAmountConvertQuote: "0",
      expectedConvertQuote: convertQuoteWithSlippage.toFixed(),
      liquidityProviderFee: quotedEthAmountWithSlippage
        .times(this.LIQUIDITY_PROVIDER_FEE)
        .toFixed(this.fromToken.decimals),
      tradeExpires,
      routePathTokenMap: bestRouteQuote.routePathArrayTokenMap,
      routeText: bestRouteQuote.routeText,
      routePath: bestRouteQuote.routePathArray,
      hasEnoughAllowance: true,
      toToken: this.toToken,
      fromToken: this.fromToken,
      fromBalance: await this.hasGotEnoughBalanceEth(
        quotedEthAmountWithSlippage.toFixed()
      ),
      transaction: this.buildUpTransactionEth(
        quotedEthAmountWithSlippage,
        data
      ),
      allTriedRoutesQuotes: bestRouteQuotes.triedRoutesQuote,
      quoteChanged$: this._quoteChanged$,
      destroy: () => this.destroy(),
    };

    return tradeContext;
  }

  /**
   * Generate trade data eth > erc20
   * @param tokenAmount The token amount
   * @param routePath The route path
   * @param deadline The deadline it expiries unix time
   */
  private generateTradeDataEthToErc20(
    amountIn: BigNumber,
    tokenAmount: BigNumber,
    routePathArray: string[],
    deadline: string
  ): string {
    const ethAmountInWei = hexlify(parseEther(amountIn));

    // pancakeswap adds extra digits on even if the token is say 8 digits long
    const convertedMinTokens = tokenAmount
      .shiftedBy(this.toToken.decimals)
      .decimalPlaces(0);

    const hex = hexlify(convertedMinTokens);

    return this._pancakeswapRouterContractFactory.swapExactETHForTokensSupportingFeeOnTransferTokens(
      // ethAmountInWei,
      hex,
      routePathArray,
      this._pancakeswapPairFactoryContext.ethereumAddress,
      deadline
    );
  }

  /**
   * Generate trade amount erc20 > eth
   * @param tokenAmount The token amount
   * @param ethAmountOutMin The min eth in eth not wei this converts it
   * @param routePathArray The route path array
   * @param deadline The deadline it expiries unix time
   */
  private generateTradeDataErc20ToEth(
    tokenAmount: BigNumber,
    ethAmountOutMin: BigNumber,
    routePathArray: string[],
    deadline: string
  ): string {
    // pancakeswap adds extra digits on even if the token is say 8 digits long
    const amountIn = tokenAmount
      .shiftedBy(this.fromToken.decimals)
      .decimalPlaces(0);

    const ethAmountOutWei = hexlify(parseEther(ethAmountOutMin));

    return this._pancakeswapRouterContractFactory.swapExactTokensForETHSupportingFeeOnTransferTokens(
      hexlify(amountIn),
      ethAmountOutWei,
      routePathArray,
      this._pancakeswapPairFactoryContext.ethereumAddress,
      deadline
    );
  }

  /**
   * Generate trade amount erc20 > erc20
   * @param tokenAmount The token amount
   * @param tokenAmountOut The min token amount out
   * @param routePathArray The route path array
   * @param deadline The deadline it expiries unix time
   */
  private generateTradeDataErc20ToErc20(
    tokenAmount: BigNumber,
    tokenAmountMin: BigNumber,
    routePathArray: string[],
    deadline: string
  ): string {
    // pancakeswap adds extra digits on even if the token is say 8 digits long
    const amountIn = tokenAmount
      .shiftedBy(this.fromToken.decimals)
      .decimalPlaces(0);
    const amountMin = tokenAmountMin
      .shiftedBy(this.toToken.decimals)
      .decimalPlaces(0);

    return this._pancakeswapRouterContractFactory.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      hexlify(amountIn),
      hexlify(amountMin),
      routePathArray,
      this._pancakeswapPairFactoryContext.ethereumAddress,
      deadline
    );
  }

  /**
   * Generate trade data eth > erc20
   * @param tokenAmount The token amount
   * @param routePath The route path
   * @param deadline The deadline it expiries unix time
   */
  private generateTradeDataExactOutputEthToErc20(
    amountIn: BigNumber,
    tokenAmount: BigNumber,
    routePathArray: string[],
    deadline: string
  ): string {
    const ethAmountInWei = hexlify(
      parseEther(amountIn.decimalPlaces(this.fromToken.decimals))
    );

    // pancakeswap adds extra digits on even if the token is say 8 digits long
    const convertedMinTokens = tokenAmount
      .shiftedBy(this.toToken.decimals)
      .decimalPlaces(0);

    const hex = hexlify(convertedMinTokens);

    return this._pancakeswapRouterContractFactory.swapETHForExactTokens(
      // ethAmountInWei,
      hex,
      routePathArray,
      this._pancakeswapPairFactoryContext.ethereumAddress,
      deadline
    );
  }

  /**
   * Generate trade amount erc20 > eth
   * @param tokenAmount The token amount
   * @param ethAmountOutMin The min eth in eth not wei this converts it
   * @param routePathArray The route path array
   * @param deadline The deadline it expiries unix time
   */
  private generateTradeDataExactOutputErc20ToEth(
    tokenAmountInMax: BigNumber,
    ethAmountOut: BigNumber,
    routePathArray: string[],
    deadline: string
  ): string {
    // pancakeswap adds extra digits on even if the token is say 8 digits long
    const amountInMax = tokenAmountInMax
      .shiftedBy(this.fromToken.decimals)
      .decimalPlaces(0);

    const ethAmountOutWei = hexlify(parseEther(ethAmountOut));

    return this._pancakeswapRouterContractFactory.swapTokensForExactETH(
      ethAmountOutWei,
      hexlify(amountInMax),
      routePathArray,
      this._pancakeswapPairFactoryContext.ethereumAddress,
      deadline
    );
  }

  /**
   * Generate trade amount erc20 > erc20
   * @param tokenAmount The token amount
   * @param tokenAmountOut The min token amount out
   * @param routePathArray The route path array
   * @param deadline The deadline it expiries unix time
   */
  private generateTradeDataExactOutputErc20ToErc20(
    tokenAmountInMax: BigNumber,
    tokenAmount: BigNumber,
    routePathArray: string[],
    deadline: string
  ): string {
    // pancakeswap adds extra digits on even if the token is say 8 digits long
    const amountInMax = tokenAmountInMax
      .shiftedBy(this.fromToken.decimals)
      .decimalPlaces(0);
    const amountOut = tokenAmount
      .shiftedBy(this.toToken.decimals)
      .decimalPlaces(0);

    return this._pancakeswapRouterContractFactory.swapTokensForExactTokens(
      hexlify(amountOut),
      hexlify(amountInMax),
      routePathArray,
      this._pancakeswapPairFactoryContext.ethereumAddress,
      deadline
    );
  }

  /**
   * Build up a transaction for erc20 from
   * @param data The data
   */
  private buildUpTransactionErc20(data: string): Transaction {
    return {
      to: ContractContext.routerAddress,
      from: this._pancakeswapPairFactoryContext.ethereumAddress,
      data,
      value: Constants.EMPTY_HEX_STRING,
    };
  }

  /**
   * Build up a transaction for eth from
   * @param ethValue The eth value
   * @param data The data
   */
  private buildUpTransactionEth(
    ethValue: BigNumber,
    data: string
  ): Transaction {
    return {
      to: ContractContext.routerAddress,
      from: this._pancakeswapPairFactoryContext.ethereumAddress,
      data,
      value: toEthersBigNumber(
        parseEther(ethValue.decimalPlaces(this.fromToken.decimals))
      ).toHexString(),
    };
  }

  /**
   * Get the trade path
   */
  private tradePath(): TradePath {
    return getTradePath(this.fromToken, this.toToken);
  }

  /**
   * Generates the trade datetime unix time
   */
  private generateTradeDeadlineUnixTime(): number {
    const now = new Date();
    const expiryDate = new Date(
      now.getTime() +
        this._pancakeswapPairFactoryContext.settings.deadlineMinutes * 60000
    );
    return (expiryDate.getTime() / 1e3) | 0;
  }

  /**
   * Watch trade price move automatically emitting the stream if it changes
   * @param tradeContext The old trade context aka the current one
   */
  private async watchTradePrice(tradeContext: TradeContext): Promise<void> {
    this._quoteChangeTimeout = setTimeout(async () => {
      if (this._quoteChanged$.observers.length > 0) {
        const trade = await this.executeTradePath(
          new BigNumber(tradeContext.baseConvertRequest)
        );
        if (
          !new BigNumber(trade.expectedConvertQuote).eq(
            tradeContext.expectedConvertQuote
          ) ||
          trade.routeText !== tradeContext.routeText
        ) {
          this._quoteChanged$.next(trade);
          this.watchTradePrice(trade);
          return;
        }

        // it has expired send another one to them
        if (tradeContext.tradeExpires > this.generateTradeDeadlineUnixTime()) {
          this._quoteChanged$.next(trade);
          this.watchTradePrice(trade);
          return;
        }

        this.watchTradePrice(tradeContext);
      } else {
        this.watchTradePrice(tradeContext);
      }
      // maybe make config???
      // query new prices every 10 seconds
    }, 10000);
  }
}

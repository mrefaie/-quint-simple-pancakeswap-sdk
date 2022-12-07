import { PancakeswapPair, PancakeswapPairSettings } from ".";

const handler = async () => {
  const pancakeSwapPair = new PancakeswapPair({
    fromTokenContractAddress: "0x55d398326f99059fF775485246999027B3197955",
    toTokenContractAddress: "0x64619f611248256F7F4b72fE83872F89d5d60d64",
    ethereumAddress: "0xc5A9BE8CD8dE39C9197E5CaD1A460184100d92b1",
    settings: new PancakeswapPairSettings({
      slippage: 2 / 100,
      deadlineMinutes: 10,
      disableMultihops: false,
    }),
  });

  const pairFactory = await pancakeSwapPair.createFactory();

  console.log(await pairFactory.tradeExactOutput("1"));
};

handler();

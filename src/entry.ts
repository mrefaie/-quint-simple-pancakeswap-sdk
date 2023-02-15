import { PancakeswapPair, PancakeswapPairSettings } from ".";

const handler = async () => {
  const pancakeSwapPair = new PancakeswapPair({
    fromTokenContractAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    toTokenContractAddress: "0x64619f611248256F7F4b72fE83872F89d5d60d64",
    ethereumAddress: "0xc5A9BE8CD8dE39C9197E5CaD1A460184100d92b1",
    settings: new PancakeswapPairSettings({
      slippage: 2 / 100,
      deadlineMinutes: 10,
      disableMultihops: false,
    }),
    isETH: true,
  });

  const pairFactory = await pancakeSwapPair.createFactory();

  console.log(await pairFactory.tradeExactOutput("1040"));
};

handler();

// lib/constants.js
// ============================================================
// ALL ADDRESSES VERIFIED FROM:
// github.com/gmx-io/gmx-synthetics/tree/main/deployments/arbitrum
// ============================================================

module.exports = {
  // ==================== NETWORKS ====================
  ARBITRUM_ONE: {
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    name: 'Arbitrum One',
  },
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    name: 'Arbitrum Sepolia',
  },

  // ==================== ArbiLink Agent Identity Registry ====================
  REGISTRY: {
    ONE: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    SEPOLIA: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  },

  // ==================== GMX V2 — Arbitrum One ====================
  // Source: github.com/gmx-io/gmx-synthetics/deployments/arbitrum/
  GMX: {
    EXCHANGE_ROUTER: '0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41',
    READER: '0x470fbC46bcC0f16532691Df360A07d8Bf5ee0789',
    DATA_STORE: '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8',
    ROUTER: '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6',
    ORDER_VAULT: '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5',
    DEPOSIT_VAULT: '0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55',

    // GMX V2 Markets (GM token addresses = market addresses)
    MARKETS: {
      'ETH/USD': '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
      'BTC/USD': '0x47c031236e19d024b42f8AE6780E44A573170703',
      'ARB/USD': '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407',
      'SOL/USD': '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9',
      'LINK/USD': '0x7f1fa204bb700853D36994DA19F830b6Ad18d045',
    },

    // Tokens on Arbitrum One
    TOKENS: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      SOL: '0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07',
      LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    },
  },

  // ==================== Chainlink Price Feeds — Arbitrum One ====================
  PRICE_FEEDS: {
    'ETH/USD': '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    'BTC/USD': '0x6ce185860a4963106506C203335A2910413708e9',
    'ARB/USD': '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6',
    'SOL/USD': '0x24ceA4b8ce57cdA5058b924B9B9987992450590c',
    'LINK/USD': '0x86E53CF1B870786351Da77A57575e79CB55812CB',
    'USDC/USD': '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
  },

  // ==================== ABIs ====================

  // Registry ABI
  REGISTRY_ABI: [
    'function registerAgent(string name, string description, string endpoint) returns (uint256 agentId)',
    'function getAgent(uint256 agentId) view returns (string name, string description, string endpoint, address owner, uint256 registeredAt)',
    'function getAgentByAddress(address owner) view returns (uint256 agentId)',
    'function updateEndpoint(uint256 agentId, string endpoint)',
    'event AgentRegistered(uint256 indexed agentId, address indexed owner, string name)',
  ],

  // Chainlink Aggregator ABI
  AGGREGATOR_ABI: [
    'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
    'function decimals() view returns (uint8)',
  ],

  // ERC20 ABI
  ERC20_ABI: [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function transfer(address to, uint256 amount) returns (bool)',
  ],

  // DataStore ABI (verified from deployment JSON)
  DATA_STORE_ABI: [
    'function getUint(bytes32 key) view returns (uint256)',
    'function getInt(bytes32 key) view returns (int256)',
    'function getAddress(bytes32 key) view returns (address)',
    'function getBool(bytes32 key) view returns (bool)',
    'function getBytes32(bytes32 key) view returns (bytes32)',
    'function getAddressCount(bytes32 setKey) view returns (uint256)',
  ],

  // GMX V2 Reader ABI — getAccountPositions (verified from Reader.json)
  // Returns Position.Props[] with nested structs
  READER_ABI: [
    // getAccountPositions
    `function getAccountPositions(
      address dataStore,
      address account,
      uint256 start,
      uint256 end
    ) view returns (
      tuple(
        tuple(address account, address market, address collateralToken) addresses,
        tuple(
          uint256 sizeInUsd,
          uint256 sizeInTokens,
          uint256 collateralAmount,
          int256 pendingImpactAmount,
          uint256 borrowingFactor,
          uint256 fundingFeeAmountPerSize,
          uint256 longTokenClaimableFundingAmountPerSize,
          uint256 shortTokenClaimableFundingAmountPerSize,
          uint256 increasedAtTime,
          uint256 decreasedAtTime
        ) numbers,
        tuple(bool isLong) flags
      )[]
    )`,
    // getMarket
    `function getMarket(
      address dataStore,
      address key
    ) view returns (
      tuple(
        address marketToken,
        address indexToken,
        address longToken,
        address shortToken
      )
    )`,
    // getAccountOrders
    `function getAccountOrders(
      address dataStore,
      address account,
      uint256 start,
      uint256 end
    ) view returns (
      tuple(
        bytes32 orderKey,
        tuple(
          tuple(
            address account,
            address receiver,
            address cancellationReceiver,
            address callbackContract,
            address uiFeeReceiver,
            address market,
            address initialCollateralToken,
            address[] swapPath
          ) addresses,
          tuple(
            uint8 orderType,
            uint8 decreasePositionSwapType,
            uint256 sizeDeltaUsd,
            uint256 initialCollateralDeltaAmount,
            uint256 triggerPrice,
            uint256 acceptablePrice,
            uint256 executionFee,
            uint256 callbackGasLimit,
            uint256 minOutputAmount,
            uint256 updatedAtTime,
            uint256 validFromTime,
            uint256 srcChainId
          ) numbers,
          tuple(
            bool isLong,
            bool shouldUnwrapNativeToken,
            bool isFrozen,
            bool autoCancel
          ) flags,
          bytes32[] _dataList
        ) order
      )[]
    )`,
  ],

  // GMX V2 ExchangeRouter ABI — createOrder (verified from ExchangeRouter.json)
  // The actual struct has nested addresses + numbers sub-tuples
  EXCHANGE_ROUTER_ABI: [
    `function createOrder(
      tuple(
        tuple(
          address receiver,
          address cancellationReceiver,
          address callbackContract,
          address uiFeeReceiver,
          address market,
          address initialCollateralToken,
          address[] swapPath
        ) addresses,
        tuple(
          uint256 sizeDeltaUsd,
          uint256 initialCollateralDeltaAmount,
          uint256 triggerPrice,
          uint256 acceptablePrice,
          uint256 executionFee,
          uint256 callbackGasLimit,
          uint256 minOutputAmount,
          uint256 validFromTime
        ) numbers,
        uint8 orderType,
        uint8 decreasePositionSwapType,
        bool isLong,
        bool shouldUnwrapNativeToken,
        bool autoCancel,
        bytes32 referralCode,
        bytes32[] dataList
      ) params
    ) payable returns (bytes32)`,
    'function cancelOrder(bytes32 key) payable',
    `function multicall(bytes[] data) payable returns (bytes[] results)`,
    'function sendWnt(address receiver, uint256 amount) payable',
    'function sendTokens(address token, address receiver, uint256 amount) payable',
  ],

  // Order type enums (from GMX V2)
  ORDER_TYPE: {
    MARKET_INCREASE: 0,
    LIMIT_INCREASE: 1,
    MARKET_DECREASE: 2,
    LIMIT_DECREASE: 3,
    STOP_LOSS_DECREASE: 4,
    LIQUIDATION: 5,
  },

  // Decrease position swap type
  DECREASE_POSITION_SWAP_TYPE: {
    NO_SWAP: 0,
    SWAP_PNL_TOKEN_TO_COLLATERAL_TOKEN: 1,
    SWAP_COLLATERAL_TOKEN_TO_PNL_TOKEN: 2,
  },
}

import { Telegraf } from "telegraf";
import {
  JsonRpcProvider,
  WebSocketProvider,
  Wallet,
  Contract,
  formatEther,
  ZeroAddress
} from "ethers";

// =====================================================
// TELEGRAM
// =====================================================

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

// =====================================================
// SEPOLIA
// =====================================================

const sepoliaProvider = new JsonRpcProvider(
  process.env.ETH_RPC_URL
);

const sepoliaWallet = new Wallet(
  process.env.WALLET_PRIVATE_KEY,
  sepoliaProvider
);

// =====================================================
// ROBINHOOD CHAIN
// =====================================================

const rhProvider = new JsonRpcProvider(
  process.env.RH_RPC_URL
);

const rhWsProvider = new WebSocketProvider(
  process.env.RH_WS_URL
);

const rhWallet = new Wallet(
  process.env.RH_PRIVATE_KEY,
  rhProvider
);

// =====================================================
// RARE FRIENDS GENESIS
// =====================================================

const NFT_CONTRACT =
  "0x116eaa62241751e0c98da43d458600c6c17cd361";

const SEADROP_CONTRACT =
  "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";

// =====================================================
// ABIS
// =====================================================

const nftAbi = [
  "function getMintStats(address minter) view returns (uint256 minterNumMinted, uint256 currentTotalSupply, uint256 maxSupply)"
];

const seadropAbi = [
  "function getPublicDrop(address nftContract) view returns (uint80 mintPrice, uint48 startTime, uint48 endTime, uint16 maxTotalMintableByWallet, uint16 feeBps, bool restrictFeeRecipients)",

  "function getAllowedFeeRecipients(address nftContract) view returns (address[])",

  "function mintPublic(address nftContract, address feeRecipient, address minterIfNotPayer, uint256 quantity) payable"
];

const nft = new Contract(
  NFT_CONTRACT,
  nftAbi,
  rhProvider
);

const seadrop = new Contract(
  SEADROP_CONTRACT,
  seadropAbi,
  rhWallet
);

// =====================================================
// SECURITY
// =====================================================

function isAdmin(ctx) {
  return (
    ADMIN_ID &&
    String(ctx.from?.id) === String(ADMIN_ID)
  );
}

async function adminOnly(ctx, next) {
  if (!isAdmin(ctx)) {
    return ctx.reply(
      "⛔ This bot is private."
    );
  }

  return next();
}

// =====================================================
// STATE
// =====================================================

let mintInProgress = false;
let autoMintArmed = false;
let autoMintExecuted = false;

// =====================================================
// TELEGRAM ID
// =====================================================

bot.command("myid", async (ctx) => {
  await ctx.reply(
    `Your Telegram ID is:\n${ctx.from.id}`
  );
});

// =====================================================
// START
// =====================================================

bot.start(async (ctx) => {

  if (!isAdmin(ctx)) {
    return ctx.reply(
      "🤖 NFT Mint Bot is online."
    );
  }

  await ctx.reply(
    "🤖 NFT Mint Bot is online!\n\n" +

    "🦊 Robinhood Chain\n" +
    "/rhstatus - Check connection\n" +
    "/rhwallet - Show mint wallet\n" +
    "/rhbalance - Show ETH balance\n\n" +

    "🎨 Rare Friends Genesis\n" +
    "/mintinfo - Check public mint\n" +
    "/mintstats - Check wallet stats\n" +
    "/mint - Manual mint\n" +
    "/autostatus - Auto-mint status\n\n" +

    "🧪 Sepolia\n" +
    "/status - Check Sepolia\n" +
    "/block - Latest Sepolia block\n" +
    "/wallet - Sepolia wallet\n" +
    "/balance - Sepolia balance"
  );
});

// =====================================================
// SEPOLIA
// =====================================================

bot.command("status", adminOnly, async (ctx) => {
  try {

    const network =
      await sepoliaProvider.getNetwork();

    await ctx.reply(
      `🟢 Sepolia connected\n` +
      `Chain ID: ${network.chainId}`
    );

  } catch (error) {

    console.error(error);

    await ctx.reply(
      "🔴 Sepolia RPC connection failed."
    );
  }
});

bot.command("block", adminOnly, async (ctx) => {
  try {

    const block =
      await sepoliaProvider.getBlockNumber();

    await ctx.reply(
      `⛓️ Latest Sepolia block: ${block}`
    );

  } catch (error) {

    console.error(error);

    await ctx.reply(
      "❌ Could not retrieve Sepolia block."
    );
  }
});

bot.command("wallet", adminOnly, async (ctx) => {

  await ctx.reply(
    `👛 Sepolia wallet:\n${sepoliaWallet.address}`
  );

});

bot.command("balance", adminOnly, async (ctx) => {

  try {

    const balance =
      await sepoliaProvider.getBalance(
        sepoliaWallet.address
      );

    await ctx.reply(
      `💰 Sepolia balance:\n${formatEther(balance)} ETH`
    );

  } catch (error) {

    console.error(error);

    await ctx.reply(
      "❌ Could not retrieve Sepolia balance."
    );
  }

});

// =====================================================
// ROBINHOOD STATUS
// =====================================================

bot.command("rhstatus", adminOnly, async (ctx) => {

  try {

    const network =
      await rhProvider.getNetwork();

    const block =
      await rhProvider.getBlockNumber();

    await ctx.reply(
      `🟢 Robinhood Chain connected\n\n` +
      `Chain ID: ${network.chainId}\n` +
      `Latest block: ${block}`
    );

  } catch (error) {

    console.error(error);

    await ctx.reply(
      "🔴 Robinhood Chain RPC connection failed."
    );
  }

});

// =====================================================
// ROBINHOOD WALLET
// =====================================================

bot.command("rhwallet", adminOnly, async (ctx) => {

  await ctx.reply(
    `👛 Robinhood mint wallet:\n${rhWallet.address}`
  );

});

// =====================================================
// ROBINHOOD BALANCE
// =====================================================

bot.command("rhbalance", adminOnly, async (ctx) => {

  try {

    const balance =
      await rhProvider.getBalance(
        rhWallet.address
      );

    await ctx.reply(
      `💰 Robinhood Chain ETH balance:\n${formatEther(balance)} ETH`
    );

  } catch (error) {

    console.error(error);

    await ctx.reply(
      "❌ Could not retrieve Robinhood balance."
    );
  }

});

// =====================================================
// MINT INFO
// =====================================================

async function getMintData() {

  const drop =
    await seadrop.getPublicDrop(
      NFT_CONTRACT
    );

  const now =
    Math.floor(Date.now() / 1000);

  const start =
    Number(drop.startTime);

  const end =
    Number(drop.endTime);

  let status;

  if (now < start) {

    status = "⏳ NOT STARTED";

  } else if (now > end) {

    status = "🔴 ENDED";

  } else {

    status = "🟢 ACTIVE";

  }

  return {
    drop,
    now,
    start,
    end,
    status
  };
}

bot.command("mintinfo", adminOnly, async (ctx) => {

  try {

    const {
      drop,
      start,
      end,
      status
    } = await getMintData();

    const recipients =
      await seadrop.getAllowedFeeRecipients(
        NFT_CONTRACT
      );

    await ctx.reply(
      `🎨 Rare Friends Genesis\n\n` +

      `Status: ${status}\n` +
      `Mint price: ${formatEther(drop.mintPrice)} ETH\n` +
      `Max per wallet: ${drop.maxTotalMintableByWallet}\n` +
      `Fee BPS: ${drop.feeBps}\n` +
      `Restricted recipients: ${drop.restrictFeeRecipients}\n\n` +

      `Start timestamp: ${start}\n` +
      `End timestamp: ${end}\n\n` +

      `Allowed fee recipients: ${recipients.length}`
    );

  } catch (error) {

    console.error(error);

    await ctx.reply(
      "❌ Could not read Rare Friends mint information."
    );
  }

});

// =====================================================
// MINT STATS
// =====================================================

bot.command("mintstats", adminOnly, async (ctx) => {

  try {

    const stats =
      await nft.getMintStats(
        rhWallet.address
      );

    await ctx.reply(
      `📊 Rare Friends wallet stats\n\n` +
      `Already minted: ${stats.minterNumMinted}\n` +
      `Current supply: ${stats.currentTotalSupply}\n` +
      `Max supply: ${stats.maxSupply}`
    );

  } catch (error) {

    console.error(error);

    await ctx.reply(
      "❌ Could not retrieve mint stats."
    );
  }

});

// =====================================================
// DYNAMIC GAS
// =====================================================

async function getDynamicGas() {

  const feeData =
    await rhProvider.getFeeData();

  const overrides = {};

  if (
    feeData.maxFeePerGas !== null &&
    feeData.maxPriorityFeePerGas !== null
  ) {

    overrides.maxFeePerGas =
      feeData.maxFeePerGas;

    overrides.maxPriorityFeePerGas =
      feeData.maxPriorityFeePerGas;

  } else if (
    feeData.gasPrice !== null
  ) {

    overrides.gasPrice =
      feeData.gasPrice;
  }

  return overrides;
}

// =====================================================
// EXECUTE MINT
// =====================================================

async function executeMint(source = "automatic") {

  if (mintInProgress) {

    console.log(
      "Mint already in progress."
    );

    return;
  }

  if (autoMintExecuted) {

    console.log(
      "Automatic mint already executed."
    );

    return;
  }

  mintInProgress = true;

  try {

    console.log(
      `🚀 Mint execution started (${source})`
    );

    // -------------------------------------------------
    // READ PUBLIC DROP
    // -------------------------------------------------

    const {
      drop,
      now,
      start,
      end
    } = await getMintData();

    // -------------------------------------------------
    // VERIFY WINDOW
    // -------------------------------------------------

    if (now < start) {

      console.log(
        `Mint has not started. ${start - now}s remaining.`
      );

      return;
    }

    if (now > end) {

      console.log(
        "Mint has already ended."
      );

      return;
    }

    // -------------------------------------------------
    // VERIFY WALLET LIMIT
    // -------------------------------------------------

    const stats =
      await nft.getMintStats(
        rhWallet.address
      );

    const alreadyMinted =
      Number(stats.minterNumMinted);

    const maxPerWallet =
      Number(drop.maxTotalMintableByWallet);

    if (
      alreadyMinted + 1 >
      maxPerWallet
    ) {

      console.log(
        "Wallet mint limit reached."
      );

      await safeTelegram(
        `⛔ Wallet has already reached the mint limit.\n\n` +
        `Already minted: ${alreadyMinted}\n` +
        `Maximum: ${maxPerWallet}`
      );

      return;
    }

    // -------------------------------------------------
    // FEE RECIPIENT
    // -------------------------------------------------

    const recipients =
      await seadrop.getAllowedFeeRecipients(
        NFT_CONTRACT
      );

    if (!recipients.length) {

      throw new Error(
        "No allowed SeaDrop fee recipient."
      );
    }

    const feeRecipient =
      recipients[0];

    // -------------------------------------------------
    // QUANTITY
    // -------------------------------------------------

    const quantity = 1;

    const value =
      drop.mintPrice *
      BigInt(quantity);

    // -------------------------------------------------
    // BALANCE
    // -------------------------------------------------

    const balance =
      await rhProvider.getBalance(
        rhWallet.address
      );

    // -------------------------------------------------
    // GAS
    // -------------------------------------------------

    const gasOverrides =
      await getDynamicGas();

    const gasEstimate =
      await seadrop.mintPublic.estimateGas(
        NFT_CONTRACT,
        feeRecipient,
        ZeroAddress,
        quantity,
        {
          value,
          ...gasOverrides
        }
      );

    // Add a modest safety margin to gas limit.
    const gasLimit =
      (gasEstimate * 120n) / 100n;

    // -------------------------------------------------
    // COST CHECK
    // -------------------------------------------------

    let gasPriceForCheck;

    if (
      gasOverrides.maxFeePerGas
    ) {

      gasPriceForCheck =
        gasOverrides.maxFeePerGas;

    } else {

      gasPriceForCheck =
        gasOverrides.gasPrice;
    }

    if (!gasPriceForCheck) {

      throw new Error(
        "Could not determine gas price."
      );
    }

    const estimatedGasCost =
      gasLimit *
      gasPriceForCheck;

    const totalRequired =
      value +
      estimatedGasCost;

    if (
      balance <
      totalRequired
    ) {

      await safeTelegram(
        `❌ Insufficient ETH.\n\n` +
        `Balance: ${formatEther(balance)} ETH\n` +
        `Estimated maximum: ${formatEther(totalRequired)} ETH`
      );

      return;
    }

    // -------------------------------------------------
    // SIMULATION
    // -------------------------------------------------

    console.log(
      "🧪 Simulating mint..."
    );

    await seadrop.mintPublic.staticCall(
      NFT_CONTRACT,
      feeRecipient,
      ZeroAddress,
      quantity,
      {
        value,
        ...gasOverrides
      }
    );

    console.log(
      "✅ Simulation passed."
    );

    // -------------------------------------------------
    // SEND TRANSACTION
    // -------------------------------------------------

    await safeTelegram(
      `🚀 Rare Friends public mint is active.\n\n` +
      `Automatic execution triggered.\n` +
      `Quantity: 1\n` +
      `Price: ${formatEther(value)} ETH\n` +
      `⛽ Dynamic network fee selected.\n\n` +
      `📡 Sending transaction...`
    );

    const tx =
      await seadrop.mintPublic(
        NFT_CONTRACT,
        feeRecipient,
        ZeroAddress,
        quantity,
        {
          value,
          gasLimit,
          ...gasOverrides
        }
      );

    autoMintExecuted = true;

    console.log(
      `📡 Transaction submitted: ${tx.hash}`
    );

    await safeTelegram(
      `📡 Transaction submitted!\n\n` +
      `Hash:\n${tx.hash}\n\n` +
      `⏳ Waiting for confirmation...`
    );

    const receipt =
      await tx.wait();

    console.log(
      `🎉 Mint confirmed in block ${receipt.blockNumber}`
    );

    await safeTelegram(
      `🎉 MINT CONFIRMED!\n\n` +
      `Rare Friends Genesis: 1 NFT\n` +
      `Block: ${receipt.blockNumber}\n\n` +
      `Transaction:\n${tx.hash}`
    );

  } catch (error) {

    console.error(
      "MINT ERROR:",
      error
    );

    let message =
      "❌ Mint failed.";

    if (error?.shortMessage) {

      message +=
        `\n\n${error.shortMessage}`;

    } else if (error?.reason) {

      message +=
        `\n\n${error.reason}`;

    } else if (error?.message) {

      message +=
        `\n\n${error.message.slice(0, 500)}`;
    }

    await safeTelegram(message);

  } finally {

    mintInProgress = false;
  }
}

// =====================================================
// TELEGRAM SAFE SEND
// =====================================================

async function safeTelegram(message) {

  if (!ADMIN_ID) {

    console.log(
      "Telegram admin ID is not configured."
    );

    return;
  }

  try {

    await bot.telegram.sendMessage(
      ADMIN_ID,
      message
    );

  } catch (error) {

    console.error(
      "Telegram notification failed:",
      error
    );
  }
}

// =====================================================
// MANUAL MINT
// =====================================================

bot.command("mint", adminOnly, async (ctx) => {

  await ctx.reply(
    "🔎 Checking Rare Friends public mint..."
  );

  await executeMint("manual");
});

// =====================================================
// AUTO STATUS
// =====================================================

bot.command("autostatus", adminOnly, async (ctx) => {

  await ctx.reply(
    `🤖 Automatic mint system\n\n` +

    `Armed: ${autoMintArmed ? "YES 🟢" : "NO 🔴"}\n` +
    `Executed: ${autoMintExecuted ? "YES ✅" : "NO"}\n` +
    `Mint in progress: ${mintInProgress ? "YES" : "NO"}`
  );

});

// =====================================================
// AUTOMATIC MINT SCHEDULER
// =====================================================

async function armAutomaticMint() {

  if (autoMintArmed) {
    return;
  }

  autoMintArmed = true;

  try {

    const {
      start,
      end
    } = await getMintData();

    const now =
      Math.floor(Date.now() / 1000);

    console.log(
      `🎯 Public mint start: ${start}`
    );

    console.log(
      `🎯 Public mint end: ${end}`
    );

    // -------------------------------------------------
    // ALREADY ENDED
    // -------------------------------------------------

    if (now > end) {

      console.log(
        "🔴 Public mint already ended."
      );

      return;
    }

    // -------------------------------------------------
    // ALREADY ACTIVE
    // -------------------------------------------------

    if (
      now >= start &&
      now <= end
    ) {

      console.log(
        "🟢 Public mint already active."
      );

      await executeMint("startup");

      return;
    }

    // -------------------------------------------------
    // WAIT UNTIL CLOSE TO START
    // -------------------------------------------------

    const secondsUntilStart =
      start - now;

    console.log(
      `⏳ Automatic execution armed. ` +
      `${secondsUntilStart}s until start.`
    );

    setTimeout(
      () => beginStartMonitoring(start, end),
      Math.max(
        0,
        (secondsUntilStart - 5) * 1000
      )
    );

  } catch (error) {

    console.error(
      "Auto-mint setup error:",
      error
    );
  }
}

// =====================================================
// START MONITORING
// =====================================================

function beginStartMonitoring(
  start,
  end
) {

  console.log(
    "👀 Beginning public mint monitoring..."
  );

  let checking = false;

  const check = async () => {

    if (
      autoMintExecuted ||
      mintInProgress
    ) {
      return;
    }

    if (checking) {
      return;
    }

    checking = true;

    try {

      const {
        now
      } = await getMintData();

      if (
        now >= start &&
        now <= end
      ) {

        console.log(
          "🟢 PUBLIC MINT ACTIVE!"
        );

        clearInterval(
          fallbackInterval
        );

        await executeMint(
          "automatic"
        );

        return;
      }

      if (now > end) {

        console.log(
          "🔴 Public mint ended."
        );

        clearInterval(
          fallbackInterval
        );
      }

    } catch (error) {

      console.error(
        "Start monitor error:",
        error
      );

    } finally {

      checking = false;
    }
  };

  const fallbackInterval =
    setInterval(
      check,
      500
    );

  check();

  // ---------------------------------------------------
  // WEBSOCKET BLOCK MONITOR
  // ---------------------------------------------------

  rhWsProvider.on(
    "block",
    async (blockNumber) => {

      if (
        autoMintExecuted ||
        mintInProgress
      ) {
        return;
      }

      try {

        const block =
          await rhWsProvider.getBlock(
            blockNumber
          );

        if (!block) {
          return;
        }

        const blockTime =
          Number(block.timestamp);

        if (
          blockTime >= start &&
          blockTime <= end
        ) {

          console.log(
            `⚡ Eligible block detected: ${blockNumber}`
          );

          clearInterval(
            fallbackInterval
          );

          await executeMint(
            "websocket"
          );
        }

      } catch (error) {

        console.error(
          "WebSocket block error:",
          error
        );
      }
    }
  );
}

// =====================================================
// TELEGRAM ERRORS
// =====================================================

bot.catch((error) => {

  console.error(
    "Telegram error:",
    error
  );

});

// =====================================================
// START BOT
// =====================================================

bot.launch();

console.log(
  "🤖 NFT Mint Bot started"
);

// Start automatic mint monitoring.

armAutomaticMint();

process.once(
  "SIGINT",
  () => {

    rhWsProvider.destroy();

    bot.stop("SIGINT");
  }
);

process.once(
  "SIGTERM",
  () => {

    rhWsProvider.destroy();

    bot.stop("SIGTERM");
  }
);

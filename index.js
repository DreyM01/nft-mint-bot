import { Telegraf } from "telegraf";
import {
  JsonRpcProvider,
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
// ABIs
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
// PUBLIC ID COMMAND
// =====================================================

bot.command("myid", async (ctx) => {
  ctx.reply(
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

  ctx.reply(
    "🤖 NFT Mint Bot is online!\n\n" +

    "🦊 Robinhood Chain\n" +
    "/rhstatus - Check connection\n" +
    "/rhwallet - Show mint wallet\n" +
    "/rhbalance - Show ETH balance\n\n" +

    "🎨 Rare Friends Genesis\n" +
    "/mintinfo - Check public mint\n" +
    "/mintstats - Check wallet mint stats\n" +
    "/mint - Simulate then mint 1 NFT\n\n" +

    "🧪 Sepolia\n" +
    "/status - Check Sepolia\n" +
    "/block - Latest Sepolia block\n" +
    "/wallet - Sepolia wallet\n" +
    "/balance - Sepolia balance"
  );
});

// =====================================================
// SEPOLIA COMMANDS
// =====================================================

bot.command("status", adminOnly, async (ctx) => {
  try {
    const network = await sepoliaProvider.getNetwork();

    ctx.reply(
      `🟢 Sepolia connected\n` +
      `Chain ID: ${network.chainId}`
    );
  } catch (error) {
    console.error(error);
    ctx.reply(
      "🔴 Sepolia RPC connection failed."
    );
  }
});

bot.command("block", adminOnly, async (ctx) => {
  try {
    const block =
      await sepoliaProvider.getBlockNumber();

    ctx.reply(
      `⛓️ Latest Sepolia block: ${block}`
    );
  } catch (error) {
    console.error(error);
    ctx.reply(
      "❌ Could not retrieve Sepolia block."
    );
  }
});

bot.command("wallet", adminOnly, async (ctx) => {
  ctx.reply(
    `👛 Sepolia wallet:\n${sepoliaWallet.address}`
  );
});

bot.command("balance", adminOnly, async (ctx) => {
  try {
    const balance =
      await sepoliaProvider.getBalance(
        sepoliaWallet.address
      );

    ctx.reply(
      `💰 Sepolia balance:\n${formatEther(balance)} ETH`
    );
  } catch (error) {
    console.error(error);
    ctx.reply(
      "❌ Could not retrieve Sepolia balance."
    );
  }
});

// =====================================================
// ROBINHOOD COMMANDS
// =====================================================

bot.command("rhstatus", adminOnly, async (ctx) => {
  try {
    const network =
      await rhProvider.getNetwork();

    const block =
      await rhProvider.getBlockNumber();

    ctx.reply(
      `🟢 Robinhood Chain connected\n\n` +
      `Chain ID: ${network.chainId}\n` +
      `Latest block: ${block}`
    );
  } catch (error) {
    console.error(error);
    ctx.reply(
      "🔴 Robinhood Chain RPC connection failed."
    );
  }
});

bot.command("rhwallet", adminOnly, async (ctx) => {
  ctx.reply(
    `👛 Robinhood mint wallet:\n${rhWallet.address}`
  );
});

bot.command("rhbalance", adminOnly, async (ctx) => {
  try {
    const balance =
      await rhProvider.getBalance(
        rhWallet.address
      );

    ctx.reply(
      `💰 Robinhood Chain ETH balance:\n${formatEther(balance)} ETH`
    );
  } catch (error) {
    console.error(error);
    ctx.reply(
      "❌ Could not retrieve Robinhood balance."
    );
  }
});

// =====================================================
// MINT INFORMATION
// =====================================================

bot.command("mintinfo", adminOnly, async (ctx) => {
  try {
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

    const mintPrice =
      drop.mintPrice;

    let status;

    if (now < start) {
      status = "⏳ NOT STARTED";
    } else if (now > end) {
      status = "🔴 ENDED";
    } else {
      status = "🟢 ACTIVE";
    }

    const recipients =
      await seadrop.getAllowedFeeRecipients(
        NFT_CONTRACT
      );

    ctx.reply(
      `🎨 Rare Friends Genesis\n\n` +

      `Status: ${status}\n` +
      `Mint price: ${formatEther(mintPrice)} ETH\n` +
      `Max per wallet: ${drop.maxTotalMintableByWallet}\n` +
      `Fee BPS: ${drop.feeBps}\n` +
      `Restricted recipients: ${drop.restrictFeeRecipients}\n\n` +

      `Start timestamp: ${start}\n` +
      `End timestamp: ${end}\n\n` +

      `Allowed fee recipients: ${recipients.length}`
    );

  } catch (error) {
    console.error(error);
    ctx.reply(
      "❌ Could not read Rare Friends mint information."
    );
  }
});

// =====================================================
// WALLET MINT STATS
// =====================================================

bot.command("mintstats", adminOnly, async (ctx) => {
  try {
    const stats =
      await nft.getMintStats(
        rhWallet.address
      );

    ctx.reply(
      `📊 Rare Friends wallet stats\n\n` +
      `Already minted: ${stats.minterNumMinted}\n` +
      `Current supply: ${stats.currentTotalSupply}\n` +
      `Max supply: ${stats.maxSupply}`
    );

  } catch (error) {
    console.error(error);
    ctx.reply(
      "❌ Could not retrieve mint stats."
    );
  }
});

// =====================================================
// MINT
// =====================================================

let mintInProgress = false;

bot.command("mint", adminOnly, async (ctx) => {

  if (mintInProgress) {
    return ctx.reply(
      "⏳ A mint transaction is already being processed."
    );
  }

  mintInProgress = true;

  try {

    await ctx.reply(
      "🔎 Checking Rare Friends public mint..."
    );

    // -----------------------------------------------
    // 1. Read public drop
    // -----------------------------------------------

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

    // -----------------------------------------------
    // 2. Check mint window
    // -----------------------------------------------

    if (now < start) {

      const seconds =
        start - now;

      return ctx.reply(
        `⏳ Public mint has not started yet.\n\n` +
        `Starts in approximately ${seconds} seconds.`
      );
    }

    if (now > end) {

      return ctx.reply(
        "🔴 The public mint has ended."
      );
    }

    // -----------------------------------------------
    // 3. Check wallet mint stats
    // -----------------------------------------------

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
      return ctx.reply(
        `⛔ Wallet has already reached its mint limit.\n\n` +
        `Already minted: ${alreadyMinted}\n` +
        `Maximum: ${maxPerWallet}`
      );
    }

    // -----------------------------------------------
    // 4. Get allowed fee recipient
    // -----------------------------------------------

    const recipients =
      await seadrop.getAllowedFeeRecipients(
        NFT_CONTRACT
      );

    if (!recipients.length) {
      return ctx.reply(
        "❌ No allowed SeaDrop fee recipient was found."
      );
    }

    const feeRecipient =
      recipients[0];

    // -----------------------------------------------
    // 5. Check balance
    // -----------------------------------------------

    const balance =
      await rhProvider.getBalance(
        rhWallet.address
      );

    // -----------------------------------------------
    // 6. Mint price
    // -----------------------------------------------

    const mintPrice =
      drop.mintPrice;

    // One NFT only.
    const quantity = 1;

    const value =
      mintPrice * BigInt(quantity);

    // -----------------------------------------------
    // 7. Estimate gas
    // -----------------------------------------------

    const gasEstimate =
      await seadrop.mintPublic.estimateGas(
        NFT_CONTRACT,
        feeRecipient,
        ZeroAddress,
        quantity,
        {
          value
        }
      );

    // -----------------------------------------------
    // 8. Check gas affordability
    // -----------------------------------------------

    const feeData =
      await rhProvider.getFeeData();

    const gasPrice =
      feeData.maxFeePerGas ??
      feeData.gasPrice;

    if (!gasPrice) {
      return ctx.reply(
        "❌ Could not determine current gas price."
      );
    }

    const estimatedGasCost =
      gasEstimate * gasPrice;

    const totalRequired =
      value + estimatedGasCost;

    if (balance < totalRequired) {
      return ctx.reply(
        `❌ Insufficient ETH for the transaction.\n\n` +
        `Balance: ${formatEther(balance)} ETH\n` +
        `Estimated required: ${formatEther(totalRequired)} ETH`
      );
    }

    await ctx.reply(
      `🟢 Public mint is ACTIVE.\n\n` +
      `Price: ${formatEther(mintPrice)} ETH\n` +
      `Quantity: 1\n` +
      `Fee recipient: ${feeRecipient}\n\n` +
      `🧪 Simulating transaction...`
    );

    // -----------------------------------------------
    // 9. SIMULATE BEFORE SENDING
    // -----------------------------------------------

    await seadrop.mintPublic.staticCall(
      NFT_CONTRACT,
      feeRecipient,
      ZeroAddress,
      quantity,
      {
        value
      }
    );

    await ctx.reply(
      "✅ Simulation passed.\n\n" +
      "🚀 Sending mint transaction..."
    );

    // -----------------------------------------------
    // 10. SEND TRANSACTION
    // -----------------------------------------------

    const tx =
      await seadrop.mintPublic(
        NFT_CONTRACT,
        feeRecipient,
        ZeroAddress,
        quantity,
        {
          value
        }
      );

    await ctx.reply(
      `📡 Transaction submitted!\n\n` +
      `Hash:\n${tx.hash}\n\n` +
      `⏳ Waiting for confirmation...`
    );

    // -----------------------------------------------
    // 11. WAIT FOR CONFIRMATION
    // -----------------------------------------------

    const receipt =
      await tx.wait();

    await ctx.reply(
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
    }

    await ctx.reply(message);

  } finally {

    mintInProgress = false;
  }
});

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

process.once(
  "SIGINT",
  () => bot.stop("SIGINT")
);

process.once(
  "SIGTERM",
  () => bot.stop("SIGTERM")
);

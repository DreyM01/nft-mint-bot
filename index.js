import { Telegraf } from "telegraf";
import { JsonRpcProvider, Wallet } from "ethers";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const provider = new JsonRpcProvider(process.env.ETH_RPC_URL);

const wallet = new Wallet(
  process.env.WALLET_PRIVATE_KEY,
  provider
);

bot.start((ctx) => {
  ctx.reply(
    "🤖 NFT Mint Bot is online!\n\n" +
    "/status - Check bot status\n" +
    "/block - Get latest Ethereum block\n" +
    "/wallet - Show test wallet address\n" +
    "/balance - Show test wallet balance"
  );
});

bot.command("status", async (ctx) => {
  try {
    const network = await provider.getNetwork();

    ctx.reply(
      `🟢 Bot online\n` +
      `Network: ${network.name}\n` +
      `Chain ID: ${network.chainId}`
    );
  } catch (error) {
    console.error(error);
    ctx.reply("🔴 RPC connection failed.");
  }
});

bot.command("block", async (ctx) => {
  try {
    const block = await provider.getBlockNumber();

    ctx.reply(`⛓️ Latest Ethereum Sepolia block: ${block}`);
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Could not retrieve the latest block.");
  }
});

bot.command("wallet", async (ctx) => {
  try {
    ctx.reply(`👛 Test wallet:\n${wallet.address}`);
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Could not read wallet.");
  }
});

bot.command("balance", async (ctx) => {
  try {
    const balance = await provider.getBalance(wallet.address);

    const eth = Number(balance) / 1e18;

    ctx.reply(`💰 Sepolia ETH balance:\n${eth.toFixed(6)} ETH`);
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Could not retrieve wallet balance.");
  }
});
bot.command("testtx", async (ctx) => {
  try {
    const balance = await provider.getBalance(wallet.address);

    const gasPrice = await provider.getFeeData();
    const gasLimit = 21000n;
    const value = 1000000000000n; // 0.000001 ETH

    const fee = gasPrice.maxFeePerGas
      ? gasPrice.maxFeePerGas * gasLimit
      : gasPrice.gasPrice * gasLimit;

    if (balance < value + fee) {
      return ctx.reply("❌ Insufficient Sepolia ETH for the test transaction.");
    }

    ctx.reply("⏳ Sending test transaction...");

    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value,
      gasLimit
    });

    ctx.reply(
      `📤 Transaction submitted!\n\n` +
      `Hash:\n${tx.hash}`
    );

    const receipt = await tx.wait();

    if (receipt.status === 1) {
      ctx.reply(
        `✅ Transaction confirmed!\n\n` +
        `Block: ${receipt.blockNumber}\n` +
        `Hash:\n${tx.hash}`
      );
    } else {
      ctx.reply("❌ Transaction reverted.");
    }
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Transaction failed. Check Railway logs.");
  }
});
bot.catch((error) => {
  console.error("Telegram error:", error);
});

bot.launch();

console.log("🤖 NFT Mint Bot started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

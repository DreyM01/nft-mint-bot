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

bot.catch((error) => {
  console.error("Telegram error:", error);
});

bot.launch();

console.log("🤖 NFT Mint Bot started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

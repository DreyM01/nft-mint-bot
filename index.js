import { Telegraf } from "telegraf";
import { JsonRpcProvider, Wallet, formatEther } from "ethers";

// Telegram
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Sepolia
const sepoliaProvider = new JsonRpcProvider(process.env.ETH_RPC_URL);
const sepoliaWallet = new Wallet(
  process.env.WALLET_PRIVATE_KEY,
  sepoliaProvider
);

// Robinhood Chain
const rhProvider = new JsonRpcProvider(process.env.RH_RPC_URL);
const rhWallet = new Wallet(
  process.env.RH_PRIVATE_KEY,
  rhProvider
);

bot.start((ctx) => {
  ctx.reply(
    "🤖 NFT Mint Bot is online!\n\n" +
    "/status - Sepolia status\n" +
    "/block - Latest Sepolia block\n" +
    "/wallet - Sepolia wallet\n" +
    "/balance - Sepolia balance\n\n" +
    "🦊 Robinhood Chain\n" +
    "/rhstatus - Robinhood status\n" +
    "/rhwallet - Robinhood wallet\n" +
    "/rhbalance - Robinhood ETH balance"
  );
});

// -------------------------
// SEPOLIA
// -------------------------

bot.command("status", async (ctx) => {
  try {
    const network = await sepoliaProvider.getNetwork();

    ctx.reply(
      `🟢 Sepolia connected\n` +
      `Network: ${network.name}\n` +
      `Chain ID: ${network.chainId}`
    );
  } catch (error) {
    console.error(error);
    ctx.reply("🔴 Sepolia RPC connection failed.");
  }
});

bot.command("block", async (ctx) => {
  try {
    const block = await sepoliaProvider.getBlockNumber();
    ctx.reply(`⛓️ Latest Sepolia block: ${block}`);
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Could not retrieve Sepolia block.");
  }
});

bot.command("wallet", async (ctx) => {
  ctx.reply(`👛 Sepolia wallet:\n${sepoliaWallet.address}`);
});

bot.command("balance", async (ctx) => {
  try {
    const balance = await sepoliaProvider.getBalance(
      sepoliaWallet.address
    );

    ctx.reply(
      `💰 Sepolia balance:\n${formatEther(balance)} ETH`
    );
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Could not retrieve Sepolia balance.");
  }
});

// -------------------------
// ROBINHOOD CHAIN
// -------------------------

bot.command("rhstatus", async (ctx) => {
  try {
    const network = await rhProvider.getNetwork();
    const block = await rhProvider.getBlockNumber();

    ctx.reply(
      `🟢 Robinhood Chain connected\n\n` +
      `Chain ID: ${network.chainId}\n` +
      `Latest block: ${block}`
    );
  } catch (error) {
    console.error(error);
    ctx.reply("🔴 Robinhood Chain RPC connection failed.");
  }
});

bot.command("rhwallet", async (ctx) => {
  try {
    ctx.reply(
      `👛 Robinhood mint wallet:\n${rhWallet.address}`
    );
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Could not read Robinhood wallet.");
  }
});

bot.command("rhbalance", async (ctx) => {
  try {
    const balance = await rhProvider.getBalance(
      rhWallet.address
    );

    ctx.reply(
      `💰 Robinhood Chain ETH balance:\n${formatEther(balance)} ETH`
    );
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Could not retrieve Robinhood balance.");
  }
});

// -------------------------
// ERROR HANDLING
// -------------------------

bot.catch((error) => {
  console.error("Telegram error:", error);
});

bot.launch();

console.log("🤖 NFT Mint Bot started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

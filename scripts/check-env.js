const mode = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  const msg = 'TELEGRAM_BOT_TOKEN is not set';
  if (mode === 'dev') {
    console.warn(`${msg} - skipping Telegram auth check`);
  } else {
    console.error(msg);
    process.exit(1);
  }
}

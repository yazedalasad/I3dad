const { spawn } = require('node:child_process');

const expoCliPath = require.resolve('expo/bin/cli');
const args = process.argv.slice(2);

const child = spawn(process.execPath, [expoCliPath, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_OFFLINE: process.env.EXPO_OFFLINE || '1',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

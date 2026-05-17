const net = require('node:net');
const tls = require('node:tls');
const fs = require('node:fs');
const path = require('node:path');

function loadEnv(rootDir = process.cwd()) {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    const [, key, rawValue] = match;
    if (process.env[key]) return;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
}

function encodeHeader(value) {
  const text = String(value || '');
  if (/^[\x00-\x7F]*$/.test(text)) return text;
  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
}

function formatAddress(address, name) {
  const cleanAddress = String(address || '').trim();
  const cleanName = String(name || '').trim();
  if (!cleanName) return cleanAddress;
  return `${encodeHeader(cleanName)} <${cleanAddress}>`;
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMime({ fromAddress, fromName, to, subject, html, text }) {
  const boundary = `i3dad_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return [
    `From: ${formatAddress(fromAddress, fromName)}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text || htmlToText(html),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

function dotStuff(value) {
  return String(value).replace(/^\./gm, '..');
}

function createSmtpClient({ host, port, secure }) {
  let socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });

  let buffer = '';
  const pending = [];

  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buffer += chunk;
    flush();
  });
  socket.on('error', (error) => {
    while (pending.length) pending.shift().reject(error);
  });

  function flush() {
    while (pending.length) {
      const match = buffer.match(/(?:^|\r?\n)(\d{3})[ -].*(?:\r?\n|$)/);
      if (!match) return;

      const lines = buffer.split(/\r?\n/);
      let endIndex = -1;
      let code = null;
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const lineMatch = line.match(/^(\d{3})([ -])/);
        if (!lineMatch) continue;
        code = Number(lineMatch[1]);
        if (lineMatch[2] === ' ') {
          endIndex = index;
          break;
        }
      }
      if (endIndex === -1 || code == null) return;

      const responseLines = lines.slice(0, endIndex + 1);
      buffer = lines.slice(endIndex + 1).join('\r\n');
      pending.shift().resolve({ code, message: responseLines.join('\n') });
    }
  }

  function read() {
    return new Promise((resolve, reject) => {
      pending.push({ resolve, reject });
      flush();
    });
  }

  async function command(line, expected) {
    socket.write(`${line}\r\n`);
    const response = await read();
    const allowed = Array.isArray(expected) ? expected : [expected];
    if (!allowed.includes(response.code)) {
      throw new Error(`SMTP ${line.split(' ')[0]} failed: ${response.message}`);
    }
    return response;
  }

  function upgradeToTls() {
    socket.removeAllListeners('data');
    const tlsSocket = tls.connect({ socket, servername: host });
    socket = tlsSocket;
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      buffer += chunk;
      flush();
    });
    socket.on('error', (error) => {
      while (pending.length) pending.shift().reject(error);
    });

    return new Promise((resolve, reject) => {
      tlsSocket.once('secureConnect', resolve);
      tlsSocket.once('error', reject);
    });
  }

  return {
    get socket() {
      return socket;
    },
    read,
    command,
    upgradeToTls,
  };
}

async function sendMail({ to, subject, html, text }) {
  loadEnv();

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'false' ? false : port === 465;
  const user = process.env.GMAIL_USER || process.env.EMAIL_HOST_USER || process.env.SMTP_USER;
  const password = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_HOST_PASSWORD || process.env.SMTP_PASSWORD;
  const fromAddress = process.env.GMAIL_FROM_EMAIL || process.env.EMAIL_FROM || user;
  const fromName = process.env.GMAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'i3dad / إعداد';

  if (!user) throw new Error('Missing Gmail username. Add EMAIL_HOST_USER or GMAIL_USER to .env');
  if (!password) throw new Error('Missing Gmail app password. Add GMAIL_APP_PASSWORD or EMAIL_HOST_PASSWORD to .env');
  if (!to) throw new Error('Missing recipient email');

  const client = createSmtpClient({ host, port, secure });
  try {
    await client.read();
    await client.command(`EHLO ${process.env.SMTP_EHLO_NAME || 'i3dad.local'}`, 250);

    if (!secure) {
      await client.command('STARTTLS', 220);
      await client.upgradeToTls();
      await client.command(`EHLO ${process.env.SMTP_EHLO_NAME || 'i3dad.local'}`, 250);
    }

    const auth = Buffer.from(`\u0000${user}\u0000${password}`, 'utf8').toString('base64');
    await client.command(`AUTH PLAIN ${auth}`, 235);
    await client.command(`MAIL FROM:<${fromAddress}>`, 250);
    await client.command(`RCPT TO:<${to}>`, [250, 251]);
    await client.command('DATA', 354);
    client.socket.write(`${dotStuff(buildMime({ fromAddress, fromName, to, subject, html, text }))}\r\n.\r\n`);
    const dataResponse = await client.read();
    if (dataResponse.code !== 250) throw new Error(`SMTP DATA failed: ${dataResponse.message}`);
    await client.command('QUIT', 221);
    return { success: true };
  } finally {
    client.socket.end();
  }
}

module.exports = {
  loadEnv,
  sendMail,
};

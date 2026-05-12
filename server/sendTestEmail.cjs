const { sendMail } = require('./smtpMailer.cjs');

const to = process.argv[2];

if (!to) {
  console.error('Usage: node server/sendTestEmail.cjs recipient@example.com');
  process.exit(1);
}

sendMail({
  to,
  subject: 'I3dad email test',
  html: `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
      <h2>I3dad</h2>
      <p>هذه رسالة اختبار من نظام البريد في I3dad.</p>
      <p style="font-size:24px;font-weight:900;color:#16A34A">إذا وصلت هذه الرسالة، فإرسال Gmail يعمل.</p>
    </div>
  `,
})
  .then(() => {
    console.log(`Email sent to ${to}`);
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });

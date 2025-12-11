// test-deepseek.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = "sk-b4d654e5a6704fa7aa6be8cd9e79d7df";
const URL = 'https://api.deepseek.com/v1/chat/completions';

async function test() {
  try {
    console.log('Sending minimal request...');
    const res = await axios.post(URL, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Say "OK" in JSON: {"status":"OK"}' }],
      max_tokens: 10
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Status:', res.status);
    console.log('✅ Tokens:', res.data.usage);
    console.log('✅ Response:', res.data.choices?.[0]?.message?.content);
  } catch (e) {
    console.error('❌ Error:', e.message);
    if (e.response) {
      console.error('Response status:', e.response.status);
      console.error('Response body:', e.response.data);
    }
  }
}

test();

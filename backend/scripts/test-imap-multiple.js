#!/usr/bin/env node

// Script to test multiple IMAP configurations
const Imap = require('imap');

console.log('🔍 Testing multiple IMAP configurations...');

const configs = [
  {
    name: 'Port 143 (TLS)',
    host: 'mail.hifapetrol.ba',
    port: 143,
    tls: true,
    user: 'airport.tuzla@hifapetrol.ba',
    password: 'Test1234'
  },
  {
    name: 'Port 143 (No TLS)',
    host: 'mail.hifapetrol.ba',
    port: 143,
    tls: false,
    user: 'airport.tuzla@hifapetrol.ba',
    password: 'Test1234'
  },
  {
    name: 'Port 993 (SSL)',
    host: 'mail.hifapetrol.ba',
    port: 993,
    tls: true,
    user: 'airport.tuzla@hifapetrol.ba',
    password: 'Test1234'
  },
  {
    name: 'Port 993 (No SSL)',
    host: 'mail.hifapetrol.ba',
    port: 993,
    tls: false,
    user: 'airport.tuzla@hifapetrol.ba',
    password: 'Test1234'
  },
  {
    name: 'Port 587 (SMTP-like)',
    host: 'mail.hifapetrol.ba',
    port: 587,
    tls: true,
    user: 'airport.tuzla@hifapetrol.ba',
    password: 'Test1234'
  }
];

async function testConfig(config) {
  return new Promise((resolve) => {
    console.log(`\n🔌 Testing: ${config.name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   TLS: ${config.tls}`);
    console.log(`   User: ${config.user}`);
    
    const imap = new Imap({
      ...config,
      tlsOptions: { rejectUnauthorized: false }
    });
    
    const timeout = setTimeout(() => {
      console.log(`   ⏰ Timeout after 10 seconds`);
      imap.end();
      resolve({ success: false, error: 'Timeout' });
    }, 10000);
    
    imap.once('ready', () => {
      console.log(`   ✅ Connection successful!`);
      clearTimeout(timeout);
      imap.end();
      resolve({ success: true });
    });
    
    imap.once('error', (err) => {
      console.log(`   ❌ Error: ${err.message}`);
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });
    
    imap.connect();
  });
}

async function runTests() {
  console.log('🚀 Starting IMAP connection tests...\n');
  
  for (const config of configs) {
    const result = await testConfig(config);
    if (result.success) {
      console.log(`\n🎉 SUCCESS! Working configuration found:`);
      console.log(`   ${config.name}`);
      console.log(`   Host: ${config.host}:${config.port}`);
      console.log(`   TLS: ${config.tls}`);
      break;
    }
  }
  
  console.log('\n📋 Test completed. If no working configuration found, check:');
  console.log('   1. Server is running and accessible');
  console.log('   2. Firewall allows IMAP connections');
  console.log('   3. Credentials are correct');
  console.log('   4. IMAP service is enabled on server');
}

runTests().catch(console.error);

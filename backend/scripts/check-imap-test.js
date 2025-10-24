#!/usr/bin/env node

// Script to test IMAP connection and diagnose issues
const Imap = require('imap');

console.log('🔍 Testing IMAP connection...');

// Get IMAP config from environment or use test credentials
const imapConfig = {
  host: process.env.IMAP_HOST || 'mail.hifapetrol.ba',
  port: parseInt(process.env.IMAP_PORT || '993', 10), // Try SSL port first
  tls: process.env.IMAP_SECURE !== 'false',
  user: process.env.IMAP_USER || 'airport.tuzla@hifapetrol.ba',
  password: process.env.IMAP_PASS || 'Test1234',
  tlsOptions: { rejectUnauthorized: false }
};

console.log('📋 IMAP Configuration:');
console.log(`Host: ${imapConfig.host}`);
console.log(`Port: ${imapConfig.port}`);
console.log(`TLS: ${imapConfig.tls}`);
console.log(`User: ${imapConfig.user}`);
console.log(`Password: ${imapConfig.password ? '***' : 'NOT SET'}`);

// Check if all required fields are set
if (!imapConfig.host || !imapConfig.user || !imapConfig.password) {
  console.error('❌ Missing IMAP configuration. Please set:');
  if (!imapConfig.host) console.error('  - IMAP_HOST');
  if (!imapConfig.user) console.error('  - IMAP_USER');
  if (!imapConfig.password) console.error('  - IMAP_PASS');
  process.exit(1);
}

console.log('\n🔌 Attempting IMAP connection...');

const imap = new Imap(imapConfig);

imap.once('ready', () => {
  console.log('✅ IMAP connection successful!');
  console.log('📁 Available mailboxes:');
  
  imap.getBoxes((err, boxes) => {
    if (err) {
      console.error('❌ Error getting mailboxes:', err);
    } else {
      console.log(JSON.stringify(boxes, null, 2));
    }
    imap.end();
  });
});

imap.once('error', (err) => {
  console.error('❌ IMAP connection error:', err);
  
  // Provide specific error analysis
  if (err.message.includes('Logging in is disabled')) {
    console.log('\n💡 Possible solutions:');
    console.log('1. Server requires OAuth instead of username/password');
    console.log('2. Server has plaintext login disabled for security');
    console.log('3. Try using App Password instead of regular password');
    console.log('4. Check if IMAP is enabled on the server');
  } else if (err.message.includes('ECONNREFUSED')) {
    console.log('\n💡 Connection refused - check:');
    console.log('1. Server is running');
    console.log('2. Port is correct (993 for SSL, 143 for TLS)');
    console.log('3. Firewall allows IMAP connections');
  } else if (err.message.includes('ENOTFOUND')) {
    console.log('\n💡 Host not found - check:');
    console.log('1. IMAP_HOST is correct');
    console.log('2. DNS resolution works');
  }
  
  process.exit(1);
});

imap.once('end', () => {
  console.log('🔚 IMAP connection ended');
});

// Set timeout
setTimeout(() => {
  console.error('⏰ IMAP connection timeout after 30 seconds');
  imap.end();
  process.exit(1);
}, 30000);

imap.connect();

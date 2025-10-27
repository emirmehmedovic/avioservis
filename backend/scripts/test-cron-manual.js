#!/usr/bin/env node

// Script to manually test CRON job functions
const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');

// Import manual functions
const { manualEmailDispatch, manualRetryFailedEmails } = require('../dist/cron/emailInvoiceCron');
const { dispatchDay } = require('../dist/services/xmlInvoiceDispatch.service');

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();

async function testEmailDispatch() {
  console.log('🧪 Testing Email Dispatch...');
  
  try {
    // Test with today's date
    const today = dayjs().format('YYYY-MM-DD');
    console.log(`📧 Testing email dispatch for ${today}`);
    
    const result = await manualEmailDispatch(today);
    console.log('✅ Email dispatch result:', result);
    
  } catch (error) {
    console.error('❌ Email dispatch failed:', error);
  }
}

async function testXmlDispatch() {
  console.log('🧪 Testing XML Dispatch...');
  
  try {
    // Test with today's date
    const today = new Date();
    console.log(`📄 Testing XML dispatch for ${dayjs(today).format('YYYY-MM-DD')}`);
    
    const result = await dispatchDay(today);
    console.log('✅ XML dispatch result:', result);
    
  } catch (error) {
    console.error('❌ XML dispatch failed:', error);
  }
}

async function testRetryFailedEmails() {
  console.log('🧪 Testing Email Retry...');
  
  try {
    const result = await manualRetryFailedEmails();
    console.log('✅ Email retry result:', result);
    
  } catch (error) {
    console.error('❌ Email retry failed:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting manual CRON job tests...\n');
  
  // Test email dispatch
  await testEmailDispatch();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test XML dispatch
  await testXmlDispatch();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test email retry
  await testRetryFailedEmails();
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('🎉 Manual CRON job tests completed!');
  
  // Close database connection
  await prisma.$disconnect();
}

runTests().catch(console.error);

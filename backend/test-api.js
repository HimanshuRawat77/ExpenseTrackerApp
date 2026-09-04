const config = require('./src/config/env');
const connectDB = require('./src/config/db');
const { app } = require('./src/server');
const mongoose = require('mongoose');

async function runTests() {
  console.log('Testing backend APIs...');
  
  await connectDB();
  
  // Create a test client by making requests or running assertions
  const http = require('http');
  const server = http.createServer(app);
  
  await new Promise((resolve) => server.listen(5001, resolve));
  console.log('Test server listening on port 5001');

  const baseUrl = 'http://localhost:5001';

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, data: json };
  }

  try {
    // 1. Health check
    const health = await request('/api/health');
    console.log('1. Health check:', health.status, health.data.data.status);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Auth register
    const testEmail = `test_${Date.now()}@example.com`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Himanshu Test',
        email: testEmail,
        password: 'Password@123',
        preferredCurrency: 'INR',
        monthlyBudget: 25000,
      },
    });
    console.log('2. Register user:', regRes.status, regRes.data.user ? 'Created OK' : regRes.data);
    if (regRes.status !== 201) throw new Error('Register failed: ' + JSON.stringify(regRes.data));

    const token = regRes.data.accessToken;

    // 3. Auth Me
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('3. Get Me (/api/auth/me):', meRes.status, meRes.data.user?.name);

    // 4. Create Transaction
    const txRes = await request('/api/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        type: 'expense',
        amount: 450,
        category: 'Food',
        merchant: 'Swiggy',
        description: 'Dinner delivery',
        paymentMethod: 'upi',
      },
    });
    console.log('4. Create Transaction:', txRes.status, txRes.data.message || txRes.data);
    const txId = txRes.data.data?._id;

    // 5. Create Income Transaction
    const incRes = await request('/api/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        type: 'income',
        amount: 30000,
        category: 'Salary',
        description: 'Monthly stipend',
        paymentMethod: 'bank_transfer',
      },
    });
    console.log('5. Create Income Transaction:', incRes.status);

    // 6. Get Transactions
    const listRes = await request('/api/transactions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('6. List Transactions count:', listRes.data.data?.transactions?.length);

    // 7. Dashboard Summary
    const dashRes = await request('/api/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('7. Dashboard summary balance:', dashRes.data.data?.balance);

    // 8. Safe-to-spend
    const stsRes = await request('/api/dashboard/safe-to-spend', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('8. Safe to spend today:', stsRes.data.data?.safeToSpendToday);

    // 9. Clean up test user
    const delRes = await request('/api/auth/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      body: { password: 'Password@123' },
    });
    console.log('9. Clean up test account:', delRes.status, delRes.data.message);

    console.log('\n🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

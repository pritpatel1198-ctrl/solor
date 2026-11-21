const settlementService = require('../services/settlementService');

async function testApi() {
  console.log('Testing Settlement Service...');
  const res = await settlementService.getMonthlySettlementReport('test-user-123', { rate: 2.50 });
  console.log('Summary:', res.summary);
  console.log('History count:', res.history.length);
  console.log('Test completed successfully!');
}

testApi().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

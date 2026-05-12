import mongoose from 'mongoose';
import connectDB from './config/dbConnection.js';
import Conversation from './models/Conversations.js';
import { getUnreadCount, getBulkUnreadCounts } from './controllers/messageController.js';

async function verifyPerformance() {
  await connectDB();
  
  // Find a user who has conversations
  const conversations = await Conversation.find({}).limit(10);
  if (conversations.length === 0) {
    console.log("No conversations found. Please run seed_performance.js first.");
    process.exit();
  }

  const userId = conversations[0].participants[0];
  const userConvs = await Conversation.find({ participants: userId });
  
  console.log(`Testing unread counts for User: ${userId} across ${userConvs.length} conversations.`);

  // 1. Test Old Way (N+1)
  console.time('Old Way (N+1)');
  const resultsOld = [];
  for (const conv of userConvs) {
    const count = await getUnreadCount(conv._id, userId);
    resultsOld.push({ id: conv._id, count });
  }
  console.timeEnd('Old Way (N+1)');

  // 2. Test New Way (Bulk)
  console.time('New Way (Bulk)');
  const resultsNewMap = await getBulkUnreadCounts(userConvs, userId);
  console.timeEnd('New Way (Bulk)');

  // 3. Verify Correctness
  let mismatch = false;
  resultsOld.forEach(res => {
    const newCount = resultsNewMap[res.id.toString()] || 0;
    if (res.count !== newCount) {
      console.error(`Mismatch for conversation ${res.id}: Old=${res.count}, New=${newCount}`);
      mismatch = true;
    }
  });

  if (!mismatch) {
    console.log("✅ SUCCESS: All counts match correctly!");
  } else {
    console.error("❌ FAILURE: Counts do not match.");
  }

  process.exit();
}

verifyPerformance().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});

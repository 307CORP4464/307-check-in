// server/routes/dailyLog.js
const express = require('express');
const router = express.Router();

// Your existing daily log routes...

// ADD THIS NEW ENDPOINT:
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEntry = req.body;
    
    // Add audit trail
    await req.db.collection('editLogs').insertOne({
      userId: req.user?.id || 'csr',
      action: 'UPDATE_DAILY_LOG',
      entryId: id,
      changes: updatedEntry,
      timestamp: new Date()
    });
    
    // Update daily log entry
    const result = await req.db.collection('dailyLogs').updateOne(
      { _id: id },
      { $set: updatedEntry }
    );
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

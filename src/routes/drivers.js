// server/routes/drivers.js
const express = require('express');
const router = express.Router();

// Your existing driver routes...

// ADD THIS NEW ENDPOINT:
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    
    // Add audit trail
    await req.db.collection('editLogs').insertOne({
      userId: req.user?.id || 'csr',
      action: 'UPDATE_DRIVER_INFO',
      driverId: id,
      changes: updatedData,
      timestamp: new Date()
    });
    
    // Update driver in database
    const result = await req.db.collection('drivers').updateOne(
      { _id: id },
      { $set: updatedData }
    );
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

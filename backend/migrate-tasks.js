const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB...');

    // We use lean() to get raw data because targetLocation was removed from schema
    const users = await User.find({}).lean();
    let migratedCount = 0;

    for (let user of users) {
      if (user.targetLocation && user.targetLocation.latitude && (!user.tasks || user.tasks.length === 0)) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            tasks: [{
              latitude: user.targetLocation.latitude,
              longitude: user.targetLocation.longitude,
              label: user.targetLocation.label || 'Assigned Task',
              setAt: user.targetLocation.setAt || new Date(),
              status: 'pending'
            }]
          }
        });
        migratedCount++;
      }
    }

    console.log(`Migration complete. Migrated ${migratedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

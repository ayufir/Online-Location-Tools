/**
 * SolarTrack Pro — Real-time Location Simulator (Fixed)
 * Run with: node scripts/simulate.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Bhopal coordinates base
const BASE_LAT = 23.2599;
const BASE_LNG = 77.4126;

async function startSimulation() {
  console.log('🚀 Starting Real-time Location Simulation...');

  try {
    // 1. Login as Admin to get employee list
    console.log('🔑 Logging in as Admin...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@solartrack.com',
      password: 'admin@123'
    });
    const adminToken = adminLogin.data.data.accessToken;

    // 2. Get real IDs from database
    const res = await axios.get(`${API_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const seededEmployees = res.data.data;

    if (seededEmployees.length === 0) {
      console.error('❌ No employees found in DB. Run npm run seed first.');
      return;
    }

    console.log(`📡 Simulating ${seededEmployees.length} employees...`);

    // 3. Setup initial coordinates and tokens
    const sockets = [];
    for (const emp of seededEmployees) {
      try {
        const empLogin = await axios.post(`${API_URL}/auth/login`, {
          email: emp.email,
          password: 'emp@123'
        });
        sockets.push({
          emp,
          token: empLogin.data.data.accessToken,
          lat: BASE_LAT + (Math.random() - 0.5) * 0.05,
          lng: BASE_LNG + (Math.random() - 0.5) * 0.05
        });
      } catch (e) {
        console.error(`❌ Could not login as ${emp.email}: ${e.message}`);
      }
    }

    // 4. Update loop
    console.log('⚙️ Starting update loop (every 5 seconds)...');
    setInterval(async () => {
      for (const s of sockets) {
        // Move slightly (simulating walking/driving)
        s.lat += (Math.random() - 0.5) * 0.001;
        s.lng += (Math.random() - 0.5) * 0.001;

        try {
          await axios.post(`${API_URL}/location/update`, {
            latitude: s.lat,
            longitude: s.lng,
            accuracy: 10,
            speed: Math.random() * 5,
            batteryLevel: Math.floor(Math.random() * 100)
          }, {
            headers: { Authorization: `Bearer ${s.token}` }
          });
          // console.log(`✅ Update: ${s.emp.name}`);
        } catch (err) {
          console.error(`❌ Failed update ${s.emp.name}:`, err.message);
        }
      }
    }, 5000);

    console.log('✅ Simulation Running. Markers should move on the dashboard map now.');

  } catch (err) {
    console.error('❌ Simulation Error:', err.response?.data?.message || err.message);
  }
}

startSimulation();

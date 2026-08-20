const axios = require('axios');

async function testLogin() {
  console.log('🧪 Testing Login API\n');

  const testUsers = [
    { email: 'it.faculty@college.edu', password: 'password123', role: 'Faculty' },
    { email: 'it.student1@college.edu', password: 'password123', role: 'Student' },
    { email: 'cs.student1@college.edu', password: 'password123', role: 'Student' }
  ];

  for (const testUser of testUsers) {
    try {
      console.log(`\n📝 Testing ${testUser.role}: ${testUser.email}`);
      
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: testUser.email,
        password: testUser.password
      });

      if (response.data.success) {
        console.log('✅ Login successful!');
        console.log(`   Name: ${response.data.data.user.name}`);
        console.log(`   Role: ${response.data.data.user.role}`);
        console.log(`   Department: ${response.data.data.user.department}`);
        console.log(`   Token received: Yes`);
      }
    } catch (error) {
      console.log('❌ Login failed!');
      if (error.response) {
        console.log(`   Error: ${error.response.data.error?.message || error.response.data.message}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  console.log('\n✅ Test complete!');
}

testLogin();

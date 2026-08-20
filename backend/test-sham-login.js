const axios = require('axios');

async function testLogin() {
  try {
    console.log('🧪 Testing Login for sham@gmail.com\n');

    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sham@gmail.com',
      password: 'Ritesh@18'
    });

    if (response.data.success) {
      const user = response.data.data.user;
      console.log('✅ LOGIN SUCCESSFUL!\n');
      console.log('User Details:');
      console.log('  📧 Email:', user.email);
      console.log('  👤 Name:', user.name);
      console.log('  🎭 Role:', user.role);
      console.log('  🏢 Department:', user.department);
      console.log('  📚 Year:', user.academicYear || 'N/A');
      console.log('  🔑 Token:', response.data.data.session.accessToken.substring(0, 50) + '...');
      console.log('\n✅ You can now login with:');
      console.log('   Email: sham@gmail.com');
      console.log('   Password: Ritesh@18');
    }
  } catch (error) {
    console.error('❌ Login failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data.error?.message || error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }
}

testLogin();

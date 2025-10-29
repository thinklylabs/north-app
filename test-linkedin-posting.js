// Test LinkedIn Posting Functionality
// Run this in your browser's developer console while logged into your app

async function testLinkedInPosting() {
  try {
    console.log('🧪 Starting LinkedIn posting test...');
    
    // First, let's get a list of posts to test with
    console.log('📋 Fetching available posts...');
    
    const postsResponse = await fetch('/api/posts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!postsResponse.ok) {
      console.error('❌ Failed to fetch posts:', await postsResponse.text());
      return;
    }
    
    const postsData = await postsResponse.json();
    console.log('📋 Available posts:', postsData);
    
    // Use the first post for testing, or create a test post ID
    const testPostId = postsData.posts?.[0]?.id || 1;
    console.log(`🎯 Using post ID: ${testPostId}`);
    
    // Test the LinkedIn posting functionality
    console.log('🚀 Testing LinkedIn post API...');
    
    const testResponse = await fetch('/api/linkedin/test-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId: testPostId,
        // Optional: add test image data
        // imageData: 'https://example.com/test-image.jpg'
      })
    });
    
    const testResult = await testResponse.json();
    
    if (testResponse.ok) {
      console.log('✅ LinkedIn posting test successful!');
      console.log('📧 Check your email for the notification');
      console.log('📊 Test result:', testResult);
      
      // Also test the regular endpoint with testMode
      console.log('🔄 Testing regular endpoint with testMode...');
      
      const regularResponse = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: testPostId,
          testMode: true
        })
      });
      
      const regularResult = await regularResponse.json();
      
      if (regularResponse.ok) {
        console.log('✅ Regular endpoint test successful!');
        console.log('📊 Regular result:', regularResult);
      } else {
        console.error('❌ Regular endpoint test failed:', regularResult);
      }
      
    } else {
      console.error('❌ LinkedIn posting test failed:', testResult);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

// Run the test
console.log('🧪 LinkedIn Posting Test Script Loaded');
console.log('📝 To run the test, call: testLinkedInPosting()');

// Auto-run the test
testLinkedInPosting();
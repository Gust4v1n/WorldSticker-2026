require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

(async () => {
  try {
    // List all users
    const { data: users } = await s.auth.admin.listUsers();
    console.log('=== USERS ===');
    for (const u of users.users) {
      console.log(`  ${u.email} -> ${u.id}`);
    }

    // For each user, count their stickers
    console.log('\n=== USER STICKERS ===');
    for (const u of users.users) {
      const { data, error } = await s.from('user_stickers').select('id, sticker_id, quantity, user_id').eq('user_id', u.id);
      if (error) {
        console.log(`  ${u.email}: ERROR - ${error.message}`);
      } else {
        console.log(`  ${u.email}: ${data.length} sticker records`);
        if (data.length > 0) {
          console.log(`    Sample:`, JSON.stringify(data.slice(0, 3)));
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();

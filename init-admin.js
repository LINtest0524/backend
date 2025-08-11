const bcrypt = require('bcrypt');

// This script generates SQL statements for database initialization
// Including creation of super admin and agent companies

async function generateInitSQL() {
  // Generate password hash (password: 123456)
  const passwordHash = await bcrypt.hash('123456', 10);
  
  console.log('='.repeat(60));
  console.log(' Database Initialization SQL Statements');
  console.log('='.repeat(60));
  console.log();
  
  console.log('-- 1. Create agent companies');
  console.log(`INSERT INTO company (id, name, code, "passwordModes", "loginMethods") VALUES`);
  console.log(`(1, 'Agent Company A', 'a', '{OLD_PASSWORD}', '{USERNAME_PASSWORD,FACEBOOK}'),`);
  console.log(`(2, 'Agent Company B', 'b', '{OLD_PASSWORD}', '{USERNAME_PASSWORD,FACEBOOK}')`);
  console.log(`ON CONFLICT (id) DO NOTHING;`);
  console.log();
  
  console.log('-- 2. Create super admin');
  console.log(`INSERT INTO "user" (username, password, role, status, created_at, updated_at) VALUES`);
  console.log(`('superadmin', '${passwordHash}', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())`);
  console.log(`ON CONFLICT (username) DO NOTHING;`);
  console.log();
  
  console.log('-- 3. Create Agent A admin');
  console.log(`INSERT INTO "user" (username, password, role, status, company_id, created_at, updated_at) VALUES`);
  console.log(`('admin_a', '${passwordHash}', 'AGENT_OWNER', 'ACTIVE', 1, NOW(), NOW())`);
  console.log(`ON CONFLICT (username) DO NOTHING;`);
  console.log();
  
  console.log('-- 4. Create Agent B admin');
  console.log(`INSERT INTO "user" (username, password, role, status, company_id, created_at, updated_at) VALUES`);
  console.log(`('admin_b', '${passwordHash}', 'AGENT_OWNER', 'ACTIVE', 2, NOW(), NOW())`);
  console.log(`ON CONFLICT (username) DO NOTHING;`);
  console.log();
  
  console.log('='.repeat(60));
  console.log('  Created Account Information:');
  console.log('='.repeat(60));
  console.log(' Super Admin:');
  console.log('   Username: superadmin');
  console.log('   Password: 123456');
  console.log('   Role: SUPER_ADMIN');
  console.log();
  console.log(' Agent A Admin:');
  console.log('   Username: admin_a');
  console.log('   Password: 123456');
  console.log('   Role: AGENT_OWNER');
  console.log('   Company: Agent Company A (code: a)');
  console.log();
  console.log(' Agent B Admin:');
  console.log('   Username: admin_b');
  console.log('   Password: 123456');
  console.log('   Role: AGENT_OWNER');
  console.log('   Company: Agent Company B (code: b)');
  console.log();
  console.log('='.repeat(60));
  console.log(' Usage Instructions:');
  console.log('1. Copy the SQL statements above');
  console.log('2. Execute them in your PostgreSQL database');
  console.log('3. Or run: psql -d your_database -f init-database.sql');
  console.log('='.repeat(60));
}

generateInitSQL().catch(console.error);
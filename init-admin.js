const bcrypt = require('bcrypt');

// 這個腳本會生成初始化資料庫所需的 SQL 語句
// 包含超級管理員和代理商公司的創建

async function generateInitSQL() {
  // 生成密碼雜湊 (密碼: 123456)
  const passwordHash = await bcrypt.hash('123456', 10);
  
  console.log('='.repeat(60));
  console.log('🚀 資料庫初始化 SQL 語句');
  console.log('='.repeat(60));
  console.log();
  
  console.log('-- 1. 創建代理商公司');
  console.log(`INSERT INTO company (id, name, code, "passwordModes", "loginMethods") VALUES`);
  console.log(`(1, '代理商公司A', 'a', '{OLD_PASSWORD}', '{USERNAME_PASSWORD,FACEBOOK}'),`);
  console.log(`(2, '代理商公司B', 'b', '{OLD_PASSWORD}', '{USERNAME_PASSWORD,FACEBOOK}')`);
  console.log(`ON CONFLICT (id) DO NOTHING;`);
  console.log();
  
  console.log('-- 2. 創建超級管理員');
  console.log(`INSERT INTO "user" (username, password, role, status, created_at, updated_at) VALUES`);
  console.log(`('superadmin', '${passwordHash}', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())`);
  console.log(`ON CONFLICT (username) DO NOTHING;`);
  console.log();
  
  console.log('-- 3. 創建代理商 A 管理員');
  console.log(`INSERT INTO "user" (username, password, role, status, company_id, created_at, updated_at) VALUES`);
  console.log(`('admin_a', '${passwordHash}', 'AGENT_OWNER', 'ACTIVE', 1, NOW(), NOW())`);
  console.log(`ON CONFLICT (username) DO NOTHING;`);
  console.log();
  
  console.log('-- 4. 創建代理商 B 管理員');
  console.log(`INSERT INTO "user" (username, password, role, status, company_id, created_at, updated_at) VALUES`);
  console.log(`('admin_b', '${passwordHash}', 'AGENT_OWNER', 'ACTIVE', 2, NOW(), NOW())`);
  console.log(`ON CONFLICT (username) DO NOTHING;`);
  console.log();
  
  console.log('='.repeat(60));
  console.log('📋 創建的帳號資訊：');
  console.log('='.repeat(60));
  console.log('🔑 超級管理員：');
  console.log('   帳號: superadmin');
  console.log('   密碼: 123456');
  console.log('   權限: SUPER_ADMIN');
  console.log();
  console.log('🏢 代理商 A 管理員：');
  console.log('   帳號: admin_a');
  console.log('   密碼: 123456');
  console.log('   權限: AGENT_OWNER');
  console.log('   公司: 代理商公司A (code: a)');
  console.log();
  console.log('🏢 代理商 B 管理員：');
  console.log('   帳號: admin_b');
  console.log('   密碼: 123456');
  console.log('   權限: AGENT_OWNER');
  console.log('   公司: 代理商公司B (code: b)');
  console.log();
  console.log('='.repeat(60));
  console.log('💡 使用方法：');
  console.log('1. 複製上面的 SQL 語句');
  console.log('2. 在您的 PostgreSQL 資料庫中執行');
  console.log('3. 或者執行: psql -d your_database -f init-database.sql');
  console.log('='.repeat(60));
}

generateInitSQL().catch(console.error);
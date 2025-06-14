const bcrypt = require('bcrypt');

const run = async () => {
  const hash = await bcrypt.hash('123456', 10);
  console.log('✅ 請貼進資料庫用的密碼 hash：\n', hash);
};

run();

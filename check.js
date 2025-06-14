const bcrypt = require('bcrypt');

const inputPassword = '123456';
const hash = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8i8B.FcP6G1Y6zYxEjGA1Ejm1du7Hm';

bcrypt.compare(inputPassword, hash).then((res) => {
  console.log('✔ 密碼比對結果：', res);
});
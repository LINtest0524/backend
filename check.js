const bcrypt = require('bcrypt');

const inputPassword = '123456';
const hash = '$2b$10$2SB1NKzgdueNgyea9njtSujTYwEDXr3k4CTstkCtN90EnSDzZENcu';

bcrypt.compare(inputPassword, hash).then((res) => {
  console.log('✔ 密碼比對結果：', res);
});
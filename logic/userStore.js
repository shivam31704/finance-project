const users = [
  {
    username: "testuser",
    email: "testuser@example.com",
    password: "ZonicDemo!23",
    name: "Test User",
  },
];

function isStrongPassword(password) {
  return /^(?=.{10,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*$/.test(
    password,
  );
}

function findUserByCredentials(username, password) {
  return users.find(
    (user) => user.username === username && user.password === password,
  );
}

function findUserByUsernameOrEmail(username, email) {
  return users.find(
    (user) => user.username === username || user.email === email,
  );
}

function addUser(user) {
  users.push(user);
}

module.exports = {
  users,
  isStrongPassword,
  findUserByCredentials,
  findUserByUsernameOrEmail,
  addUser,
};

const axios = require('axios');
const userModel = require('../models/userModel');


async function getUser(userId) {
  const info = await userModel.getInfoUser(userId);
  return info;
}

async function updateUser(userId, username) {
  const updated = await userModel.updateUser(userId, username);
  return updated;
}

module.exports = { getUser, updateUser };
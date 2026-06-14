const axios = require('axios');
const friendsModel = require('../models/friendsModel');


async function getFriends(userId) {
  const info = await friendsModel.getFriends(userId);
  return info;
}

async function addFriend(userId1, userId2) {
  const added = await friendsModel.addFriend(userId1, userId2);
  return added;
}

async function removeFriend(userId1, userId2) {
  const removed = await friendsModel.removeFriend(userId1, userId2);
  return removed;
}

async function acceptFriend(userId1, userId2) {
  const accepted = await friendsModel.acceptFriend(userId1, userId2);
  return accepted;
}

module.exports = { getFriends, addFriend, removeFriend, acceptFriend };
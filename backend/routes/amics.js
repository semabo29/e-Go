const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friendsController');

// Informació del usuari
router.get('/', friendsController.getFriends);
router.post('/', friendsController.addFriend);
router.put('/', friendsController.acceptFriend);
router.delete('/', friendsController.removeFriend);

module.exports = router;

const express = require('express');
const multer = require('multer');
const incidenciaController = require('../controllers/incidenciaController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get('/types', incidenciaController.getTypes);
router.post('/', upload.single('arxiu'), incidenciaController.create);

module.exports = router;

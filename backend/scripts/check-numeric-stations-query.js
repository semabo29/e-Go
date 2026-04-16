const { getAllStations } = require('../models/stationModel');

(async () => {
  const rows = await getAllStations({});
  console.log('numeric rows:', rows.length);
})();


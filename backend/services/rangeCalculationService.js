const { decode } = require("@googlemaps/polyline-codec");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const ENERGY_CONSTANTS = { // datos estimados desde valores conocidos publicamente
  bike: {
    baseConsumption: 0.008, // kWh/km
    elevationFactor: 0.000003, // kWh/m
  },
  car: {
    baseConsumption: 0.15, // kWh/km
    elevationFactor: 0.0000015, // kWh/m
  },
};

async function canReach({ start, end, vehicleType, batteryKWh }) {
  try {
    if (!start || typeof start.lat !== "number" || typeof start.lon !== "number") {
      throw new Error("Invalid start coordinate");
    }

    if (!end || typeof end.lat !== "number" || typeof end.lon !== "number") {
      throw new Error("Invalid end coordinate.");
    }

    if (!["bike", "car"].includes(vehicleType)) {
      throw new Error("Invalid vehicleType.");
    }

    if (typeof batteryKWh !== "number" || batteryKWh < 0) {
      throw new Error("Invalid batteryKWh.");
    }


    const routeData = await getRoute(start, end, vehicleType); //obtener distancia y puntos del recorrido
    const distanceKm = routeData.distanceMeters / 1000;
    const pointsInRoute = routeData.polyline; //array con los puntos del recorrido

    const elevationGainM = await getElevationGain(pointsInRoute); //calcular la elevacion total 
    const energyNeeded = estimateEnergy(distanceKm, elevationGainM, vehicleType); //calcular energia necesaria para el recorrido a partir de la distancia y la elevacion
    
    const batteryLeftKWh = batteryKWh - energyNeeded; //calcular la bateria que quedara despues de hacer el recorrido
    const canReach = (batteryLeftKWh >= 0) ? true : false;

    return {
      canReach, //bool
      batteryLeftKWh: Math.round(batteryLeftKWh * 100) / 100, 
    };
  } catch (error) {
    console.error("Error in canReach:", error);
    throw error;
  }
}


async function getRoute(start, end, vehicleType) {
  try {
    const mode = (vehicleType === 'bike') ? 'bicycling' : 'driving'; //modo de transporte
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.lat},${start.lon}&destination=${end.lat},${end.lon}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Maps Directions API error: ${data.status}`);
    }

    const route = data.routes[0];
    const distanceMeters = route.legs[0].distance.value;
    const polyline = decode(route.overview_polyline.points).map(([lat, lon]) => ({
      lat,
      lon,
    }));
    const sampledPolyline = samplePolyline(polyline, 75);

    return { distanceMeters, polyline: sampledPolyline };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get route: ${message}`, { cause: error });
  }
}

async function getElevationGain(pointsInRoute) {
  try {
    if (!pointsInRoute || pointsInRoute.length === 0) {
      throw new Error("Route points are empty");
    }
    
    if (pointsInRoute.length < 2) {
      throw new Error("Route must have at least 2 points");
    }

    // Fetch elevations from Google API (points already sampled)
    const locations = pointsInRoute.map(p => `${p.lat},${p.lon}`).join('|');
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${locations}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Elevation API error: ${data.status}`);
    }

    // Extract elevations and calculate total gain
    const elevations = data.results.map(r => r.elevation);
    let elevationGain = 0;

    for (let i = 1; i < elevations.length; i++) {
      const difference = elevations[i] - elevations[i - 1];
      if (difference > 0) {
        elevationGain += difference;
      }
    }

    return elevationGain;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get elevation gain: ${message}`, {
      cause: error,
    });
  }
}

function estimateEnergy(distanceKm, elevationGainM, vehicleType) {
  const constants = ENERGY_CONSTANTS[vehicleType];

  if (!constants) {
    throw new Error(`Unknown vehicle type: ${vehicleType}`);
  }

  const baseEnergy = distanceKm * constants.baseConsumption;
  const elevationEnergy = elevationGainM * constants.elevationFactor;
  const totalEnergy = baseEnergy + elevationEnergy;

  return totalEnergy * 1.2; //margen del 20% para cubrir errores
}

function samplePolyline(pointsInRoute, numPoints) {
  if (!pointsInRoute.length) {
    return [];
  }
  if (pointsInRoute.length <= numPoints) {
    return pointsInRoute.slice();
  }
  if (numPoints < 2) {
    return [pointsInRoute[0]];
  }

  const last = pointsInRoute.length - 1;
  const sampled = new Array(numPoints);
  for (let k = 0; k < numPoints; k++) { //la polyline tenia mas de 75 puntos
    const idx = Math.round((k * last) / (numPoints - 1));
    sampled[k] = pointsInRoute[idx];
  }
  return sampled;
}

module.exports = {
  canReach,
};

const { decode } = require("@googlemaps/polyline-codec");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const ENERGY_CONSTANTS = { // datos estimados de consumo de energia a partir de valores conocidos publicamente
  bike: {
    baseConsumption: 0.008, // kWh/km
    elevationFactor: 0.000003, // kWh/m
  },
  car: {
    baseConsumption: 0.15, // kWh/km
    elevationFactor: 0.0000015, // kWh/m
  },
};

const SPEED_CONSUMPTION_PROFILES = {
  bike: {
    lowMaxKmh: 15,
    highMinKmh: 25,
    factors: {
      low: 0.95,
      normal: 1,
      high: 1.1,
    },
  },
  car: {
    lowMaxKmh: 40,
    highMinKmh: 90,
    factors: {
      low: 0.95,
      normal: 1,
      high: 1.15,
    },
  },
};

async function canReach({ start, end, vehicleType, batteryKWh }) {
  try {
    //validar los datos de entrada
    if (!start || isNaN(start.lat) || isNaN(start.lon) || start.lat < -90 || start.lat > 90 || start.lon < -180 || start.lon > 180) {
      const err = new Error("Coordenadas de inicio inválidas.");
      err.type = "VALIDATION_ERROR";
      throw err;
    }

    if (!end || isNaN(end.lat) || isNaN(end.lon) || end.lat < -90 || end.lat > 90 || end.lon < -180 || end.lon > 180) {
      const err = new Error("Coordenadas de final inválidas.");
      err.type = "VALIDATION_ERROR";
      throw err;
    }

    if (!["bike", "car"].includes(vehicleType)) {
      const err = new Error("Tipo de vehículo inválido.");
      err.type = "VALIDATION_ERROR";
      throw err;
    }

    if (isNaN(batteryKWh) || batteryKWh < 0) {
      const err = new Error("Batería inválida.");
      err.type = "VALIDATION_ERROR";
      throw err;
    }

    const routeData = await getRoute(start, end, vehicleType); //obtener distancia y puntos del recorrido
    const distanceKm = routeData.distanceMeters / 1000;
    const averageSpeed = routeData.durationSeconds > 0 ? (routeData.distanceMeters / routeData.durationSeconds) * 3.6 : 0; //en km/h
    const pointsInRoute = routeData.polyline; //array con los puntos del recorrido

    const elevationGainM = await getElevationGain(pointsInRoute); //calcular la elevacion total 
    const energyNeeded = estimateEnergy(distanceKm, elevationGainM, vehicleType, averageSpeed); //calcular energia necesaria para el recorrido a partir de la distancia y la elevacion
    
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
    

    //errores de la API de Google Maps
    if(data.status === 'ZERO_RESULTS') {
      const err = new Error('No hay una ruta disponible entre los puntos de origen y destino');
      err.type = 'ROUTE_NOT_FOUND';
      throw err;
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      const err = new Error('Demasiadas solicitudes a la API. Intenta de nuevo más tarde.');
      err.type = 'OVER_QUERY_LIMIT';
      throw err;
    } else if (data.status !== 'OK') {
      throw new Error(`Google Maps Directions API error: ${data.status}`);
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const distanceMeters = leg.distance.value;
    const durationSeconds = leg.duration.value;
    const polyline = decode(route.overview_polyline.points).map(([lat, lon]) => ({
      lat,
      lon,
    }));
    const sampledPolyline = samplePolyline(polyline, 75);

    return { distanceMeters, durationSeconds, polyline: sampledPolyline };
  } catch (error) {
    // Preserve typed domain errors so the controller can map them to HTTP status codes.
    if (error && typeof error === 'object' && error.type) {
      throw error;
    }
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

    // coger la elevacion de cada punto del recorrido a partir de la API de Google Maps
    const locations = pointsInRoute.map(p => `${p.lat},${p.lon}`).join('|');
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${locations}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Elevation API error: ${data.status}`);
    }

    // calcular elevacion total del recorrido
    const elevations = data.results.map(r => r.elevation);
    let elevationGain = 0;

    for (let i = 1; i < elevations.length; i++) {
      const difference = elevations[i] - elevations[i - 1];
      if (difference > 0) { //si hay elevacion positiva
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

//Modelo simple que aplica un multiplicador al consumo según la velocidad media del recorrido
function getSpeedConsumptionFactor(vehicleType, averageSpeed) {
  if (!Number.isFinite(averageSpeed) || averageSpeed <= 0) {
    return 1;
  }

  const profile = SPEED_CONSUMPTION_PROFILES[vehicleType];
  if (!profile) {
    return 1;
  }

  if (averageSpeed < profile.lowMaxKmh) {
    return profile.factors.low;
  }
  if (averageSpeed > profile.highMinKmh) {
    return profile.factors.high;
  }
  return profile.factors.normal;
}

function estimateEnergy(distanceKm, elevationGainM, vehicleType, averageSpeed) {
  const constants = ENERGY_CONSTANTS[vehicleType];

  if (!constants) {
    throw new Error(`Unknown vehicle type: ${vehicleType}`);
  }

  const speedFactor = getSpeedConsumptionFactor(vehicleType, averageSpeed);
  const baseEnergy = distanceKm * constants.baseConsumption * speedFactor;
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

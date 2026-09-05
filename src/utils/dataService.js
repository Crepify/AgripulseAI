import { MANDI_PRICES } from '../data/agriData';

// Mock Spore Radar Data
const MOCK_WEATHER = {
  temp: 26,
  humidity: 82,
  wind: 12,
  risk: 'High Risk'
};

export async function getWeatherData() {
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
  if (!apiKey) {
    console.log('No VITE_WEATHER_API_KEY found, using mock weather data.');
    return MOCK_WEATHER;
  }

  try {
    // Example: OpenWeatherMap API call
    // Hardcoded to a sample location (e.g. Pune) for demonstration
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Pune&units=metric&appid=${apiKey}`);
    if (!res.ok) throw new Error('Weather API failed');
    const data = await res.json();
    return {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      wind: Math.round(data.wind.speed * 3.6), // m/s to km/h
      risk: data.main.humidity > 80 ? 'High Risk' : 'Low Risk'
    };
  } catch (err) {
    console.error('Error fetching weather data, falling back to mock:', err);
    return MOCK_WEATHER;
  }
}

export async function getMandiPrices() {
  const apiKey = import.meta.env.VITE_MANDI_API_KEY;
  if (!apiKey) {
    console.log('No VITE_MANDI_API_KEY found, using mock mandi prices.');
    return MANDI_PRICES;
  }

  try {
    // Example: fetching from a real commodity API endpoint
    const res = await fetch(`https://api.example-commodity.com/prices?key=${apiKey}`);
    if (!res.ok) throw new Error('Mandi API failed');
    const data = await res.json();
    // Assuming data is formatted correctly or we map it to our UI format
    return data;
  } catch (err) {
    console.error('Error fetching mandi prices, falling back to mock:', err);
    return MANDI_PRICES;
  }
}

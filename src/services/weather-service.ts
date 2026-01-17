/**
 * @fileoverview Service for fetching weather data from external APIs.
 *
 * This file contains the logic to interact with the Open-Meteo API
 * to retrieve weather forecast data.
 */

export async function getWeather(latitude: number, longitude: number): Promise<string> {
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean,wind_speed_10m_max&timezone=auto&forecast_days=7`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Error fetching weather data: ${response.statusText}`);
    }
    const data = await response.json();

    // Format the data into a human-readable summary string
    let summary = "Resumen del pronóstico para los próximos 7 días:\n";
    const daily = data.daily;
    
    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(daily.time[i]).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
        const maxTemp = daily.temperature_2m_max[i];
        const minTemp = daily.temperature_2m_min[i];
        const precipProb = daily.precipitation_probability_mean[i];
        const windSpeed = daily.wind_speed_10m_max[i];

        summary += `- ${date}: Temp ${minTemp}°C a ${maxTemp}°C, Lluvia: ${precipProb}%, Viento: hasta ${windSpeed} km/h.\n`;
    }

    return summary;

  } catch (error) {
    console.error("Failed to get weather from Open-Meteo:", error);
    return "No se pudo obtener el pronóstico del tiempo. Por favor, verifique la conexión o las coordenadas.";
  }
}

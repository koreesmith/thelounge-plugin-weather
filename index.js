const https = require('https');

// Replace 'YOUR_API_KEY' with your actual OpenWeatherMap API key
const API_KEY = 'YOUR_API_KEY';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

const weatherCommand = {
    input: function (client, target, command, args) {
        try {
            const argArray = args;

            console.info("[ Weather Plugin ] Received arguments:", argArray);

            if (!argArray || argArray.length === 0) {
                client.sendMessage(
                    "Usage: /weather city[, state code or country code]. You can also specify the -c flag to send the weather report to the current channel.",
                    target.chan
                );
                return;
            }

            // Check if the user wants to send to the channel (-c flag)
            const sendToChannel = argArray.includes('-c');

            // Filter out the -c flag and handle location arguments
            const locationArgs = argArray.filter(arg => arg !== '-c');
            const locationArg = locationArgs.join(' ').trim();

            console.info("[ Weather Plugin ] Location argument:", locationArg);

            if (!locationArg) {
                client.sendMessage(
                    "Please provide a valid city name, and optionally state/country code.",
                    target.chan
                );
                return;
            }

            // Step 1: Use the Geocoding API to fetch latitude and longitude
            const geoUrl = `${GEO_API_URL}?q=${encodeURIComponent(locationArg)}&limit=1&appid=${API_KEY}`;
            console.info("[ Weather Plugin ] Fetching geolocation data for:", locationArg);
            console.info("[ Weather Plugin ] Geo API URL:", geoUrl);

            https.get(geoUrl, (geoRes) => {
                let geoData = '';

                geoRes.on('data', (chunk) => {
                    geoData += chunk;
                });

                geoRes.on('end', () => {
                    try {
                        const geoResult = JSON.parse(geoData);
                        console.info("[ Weather Plugin ] Geolocation API Response:", geoResult);

                        if (!geoResult || geoResult.length === 0) {
                            client.sendMessage(
                                `Error: Location not found for "${locationArg}".`,
                                target.chan
                            );
                            return;
                        }

                        const { lat, lon, name } = geoResult[0];

                        // Step 2: Use the latitude and longitude to fetch weather data
                        const weatherUrl = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;

                        console.info("[ Weather Plugin ] Fetching weather data for coordinates:", lat, lon);
                        console.info("[ Weather Plugin ] Weather API URL:", weatherUrl);

                        https.get(weatherUrl, (weatherRes) => {
                            let weatherData = '';

                            weatherRes.on('data', (chunk) => {
                                weatherData += chunk;
                            });

                            weatherRes.on('end', () => {
                                try {
                                    const weatherResult = JSON.parse(weatherData);
                                    console.info("[ Weather Plugin ] Weather API Response:", weatherResult);

                                    if (weatherResult.cod !== 200) {
                                        client.sendMessage(
                                            `Error: ${weatherResult.message}`,
                                            target.chan
                                        );
                                        return;
                                    }

                                    const { main, weather } = weatherResult;
                                    const weatherDescription = weather[0].description;
                                    const temperature = main.temp;
                                    const feels_like = main.feels_like;
                                    const humidity = main.humidity;

                                    const message = `Weather in ${name}: ${temperature}F, ${weatherDescription}, Feels Like: ${feels_like}F, Humidity: ${humidity}%`;

                                    if (sendToChannel) {
                                        client.runAsUser(message, target.chan.id);
                                    } else {
                                        client.sendMessage(message, target.chan);
                                    }

                                } catch (error) {
                                    console.error("[ Weather Plugin ] JSON parsing error:", error);
                                    client.sendMessage(
                                        "Could not parse weather data. Please try again later.",
                                        target.chan
                                    );
                                }
                            });
                        }).on('error', (error) => {
                            console.error("[ Weather Plugin ] Weather API request error:", error);
                            client.sendMessage(
                                "Could not retrieve weather data. Please check the location and try again.",
                                target.chan
                            );
                        });

                    } catch (error) {
                        console.error("[ Weather Plugin ] Geolocation JSON parsing error:", error);
                        client.sendMessage(
                            "Could not retrieve geolocation data. Please try again later.",
                            target.chan
                        );
                    }
                });
            }).on('error', (error) => {
                console.error("[ Weather Plugin ] Geolocation API request error:", error);
                client.sendMessage(
                    "Could not retrieve location data. Please check the location and try again.",
                    target.chan
                );
            });

        } catch (error) {
            console.error("[ Weather Plugin ] Unexpected error:", error);
            client.sendMessage(
                "An unexpected error occurred while retrieving weather data.",
                target.chan
            );
        }
    },
    allowDisconnected: true,
};

module.exports = {
    onServerStart: api => {
        try {
            console.info("[ Weather Plugin ] Registering weather command...");
            api.Commands.add("weather", weatherCommand);
        } catch (error) {
            console.error("[ Weather Plugin ] Error registering weather command:", error);
        }
    },
};


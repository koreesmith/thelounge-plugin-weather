const https = require('https');

// Replace 'YOUR_API_KEY' with your actual OpenWeatherMap API key
const API_KEY = 'YOUR_API_KEY';
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

const weatherCommand = {
    input: function (client, target, command, args) {
        try {
            const argArray = args;

            console.info("[ Weather Plugin ] Received arguments:", argArray);

            if (!argArray || argArray.length === 0) {
                client.sendMessage(
                    "Usage: /weather zipcode|city name.  You can also specify the -c flag to send the weather report to the current channel.",
                    target.chan
                );
                return;
            }

            const sendToChannel = argArray.includes('-c');
            const locationArg = argArray.filter(arg => arg !== '-c').join(' ');

            console.info("[ Weather Plugin ] Location argument:", locationArg);

            if (!locationArg || locationArg.trim().length === 0) {
                client.sendMessage(
                    "Please provide a valid city name or zip code.",
                    target.chan
                );
                return;
            }

            const url = `${API_URL}?q=${locationArg}&appid=${API_KEY}&units=imperial`;

            console.info("[ Weather Plugin ] Fetching weather data for:", locationArg);
            console.info("[ Weather Plugin ] API URL:", url);

            https.get(url, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const weatherData = JSON.parse(data);

                        console.info("[ Weather Plugin ] API Response:", weatherData);

                        if (weatherData.cod !== 200) {
                            client.sendMessage(
                                `Error: ${weatherData.message}`,
                                target.chan
                            );
                            return;
                        }

                        const { name, main, weather } = weatherData;
                        const weatherDescription = weather[0].description;
                        const temperature = main.temp;
			const feels_like = main.feels_like;
			const humidity = main.humidity;

                        const message = `Weather in ${name}: ${temperature}F, ${weatherDescription}, Feels Like: ${feels_like}F, Humidity:  ${humidity}%`;

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
                console.error("[ Weather Plugin ] Request error:", error);
                client.sendMessage(
                    "Could not retrieve weather data. Please check the location and try again.",
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


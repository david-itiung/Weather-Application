const apiKey = "fff541ccf27c461c897124056262311";

// DOM Elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const unitToggleBtn = document.getElementById("unit-toggle");
const errorMessageEl = document.getElementById("error-message");
const loadingMessageEl = document.getElementById("loading-message");
const suggestionsListEl = document.getElementById("suggestions-list");

const cityNameEl = document.getElementById("city-name");
const weatherIconEl = document.getElementById("weather-icon");
const tempValueEl = document.getElementById("temp-value");
const weatherDescriptionEl = document.getElementById("weather-description");
const humidityValueEl = document.getElementById("humidity-value");
const windValueEl = document.getElementById("wind-value");
const hourlyListEl = document.getElementById("hourly-list");
const forecastListEl = document.getElementById("forecast-list");

// State
let latestWeatherData = null;
let useFahrenheit = false;
let suggestionTimeoutId = null;

// --- UI State Helpers ---
function showError(message) {
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
    errorMessageEl.hidden = false;
  }
}

function clearError() {
  if (errorMessageEl) {
    errorMessageEl.textContent = "";
    errorMessageEl.hidden = true;
  }
}

function setLoading(isLoading) {
  if (searchBtn) searchBtn.disabled = isLoading;
  if (locationBtn) locationBtn.disabled = isLoading;
  if (loadingMessageEl) loadingMessageEl.hidden = !isLoading;
}

function clearSuggestions() {
  if (!suggestionsListEl) return;
  suggestionsListEl.innerHTML = "";
  suggestionsListEl.hidden = true;
}

// --- Formatting Helpers ---
function formatDayLabel(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatHourLabel(dateTimeString) {
  const timePart = dateTimeString.split(" ")[1] || "00:00";
  const [hourStr] = timePart.split(":");
  const hourNum = Number(hourStr);

  const period = hourNum >= 12 ? "PM" : "AM";
  const twelveHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
  return `${twelveHour} ${period}`;
}

// --- Rendering Functions ---
function updateWeatherTheme(data) {
  const isDay = data.current?.is_day === 1;
  const conditionText = (data.current?.condition?.text || "").toLowerCase();

  document.body.classList.remove("theme-day", "theme-night", "theme-rain", "theme-cloudy");
  document.body.classList.add(isDay ? "theme-day" : "theme-night");

  if (
    conditionText.includes("rain") ||
    conditionText.includes("drizzle") ||
    conditionText.includes("thunder") ||
    conditionText.includes("shower")
  ) {
    document.body.classList.add("theme-rain");
  } else if (
    conditionText.includes("cloud") ||
    conditionText.includes("overcast") ||
    conditionText.includes("mist")
  ) {
    document.body.classList.add("theme-cloudy");
  }
}

function renderHourlyForecast(data) {
  if (!hourlyListEl) return;

  hourlyListEl.innerHTML = "";

  const todayHours = data.forecast?.forecastday?.[0]?.hour || [];
  const localTimeStr = data.location?.localtime || "";
  const currentHourPrefix = localTimeStr.slice(0, 13);

  let upcomingHours = todayHours.filter((h) => h.time.slice(0, 13) >= currentHourPrefix);
  if (upcomingHours.length === 0) {
    upcomingHours = todayHours;
  }

  upcomingHours.slice(0, 8).forEach((hourItem) => {
    const temp = useFahrenheit
      ? `${Math.round(hourItem.temp_f)}°F`
      : `${Math.round(hourItem.temp_c)}°C`;

    const slot = document.createElement("div");
    slot.className = "hourly-item";

    const timeEl = document.createElement("span");
    timeEl.className = "hourly-time";
    timeEl.textContent = formatHourLabel(hourItem.time);

    const iconEl = document.createElement("img");
    iconEl.className = "hourly-icon";
    iconEl.src = `https:${hourItem.condition.icon}`;
    iconEl.alt = hourItem.condition.text;

    const tempEl = document.createElement("span");
    tempEl.className = "hourly-temp";
    tempEl.textContent = temp;

    const rainEl = document.createElement("span");
    rainEl.className = "hourly-rain";
    rainEl.textContent = `${hourItem.chance_of_rain}% rain`;

    slot.append(timeEl, iconEl, tempEl, rainEl);
    hourlyListEl.appendChild(slot);
  });
}

function renderForecast(data) {
  if (!forecastListEl) return;

  forecastListEl.innerHTML = "";
  const forecastDays = data.forecast?.forecastday || [];

  forecastDays.forEach((dayItem) => {
    const maxTemp = useFahrenheit
      ? `${Math.round(dayItem.day.maxtemp_f)}°F`
      : `${Math.round(dayItem.day.maxtemp_c)}°C`;

    const minTemp = useFahrenheit
      ? `${Math.round(dayItem.day.mintemp_f)}°F`
      : `${Math.round(dayItem.day.mintemp_c)}°C`;

    const card = document.createElement("div");
    card.className = "forecast-card";

    const dayLabel = document.createElement("span");
    dayLabel.className = "forecast-day";
    dayLabel.textContent = formatDayLabel(dayItem.date);

    const icon = document.createElement("img");
    icon.className = "forecast-icon";
    icon.src = `https:${dayItem.day.condition.icon}`;
    icon.alt = dayItem.day.condition.text;

    const temps = document.createElement("div");
    temps.className = "forecast-temps";
    temps.textContent = `${maxTemp} / ${minTemp}`;

    card.append(dayLabel, icon, temps);
    forecastListEl.appendChild(card);
  });
}

function renderWeather(data) {
  const temp = useFahrenheit
    ? `${Math.round(data.current.temp_f)}°F`
    : `${Math.round(data.current.temp_c)}°C`;

  const wind = useFahrenheit
    ? `${data.current.wind_mph} mph`
    : `${data.current.wind_kph} km/h`;

  cityNameEl.textContent = `${data.location.name}, ${data.location.country}`;
  tempValueEl.textContent = temp;
  weatherDescriptionEl.textContent = data.current.condition.text;
  humidityValueEl.textContent = `${data.current.humidity}%`;
  windValueEl.textContent = wind;

  weatherIconEl.src = `https:${data.current.condition.icon}`;
  weatherIconEl.alt = data.current.condition.text;

  renderHourlyForecast(data);
  renderForecast(data);
  updateWeatherTheme(data);
}

function displayWeather(data, cityToSave) {
  clearError();
  latestWeatherData = data;
  renderWeather(data);

  if (cityToSave) {
    localStorage.setItem("lastCity", cityToSave);
  }
}

function renderSuggestions(matches) {
  if (!suggestionsListEl) return;

  suggestionsListEl.innerHTML = "";

  if (!Array.isArray(matches) || matches.length === 0) {
    suggestionsListEl.hidden = true;
    return;
  }

  matches.slice(0, 5).forEach((place) => {
    const item = document.createElement("li");
    item.className = "suggestion-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion-btn";

    const regionPart = place.region ? `, ${place.region}` : "";
    btn.textContent = `${place.name}${regionPart}, ${place.country}`;

    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const selectedQuery = `${place.name}, ${place.country}`;
      cityInput.value = selectedQuery;
      clearSuggestions();
      handleSearch(selectedQuery);
    });

    item.appendChild(btn);
    suggestionsListEl.appendChild(item);
  });

  suggestionsListEl.hidden = false;
}

// --- API & Browser Calls ---
async function fetchWeather(city) {
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=3`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Could not fetch weather data.");
  }

  return data;
}

async function fetchSuggestions(query) {
  const url = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);

  if (!response.ok) {
    return [];
  }

  return await response.json();
}

function getCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve(`${latitude},${longitude}`);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location access was denied. Please search by city name."));
        } else {
          reject(new Error("Unable to retrieve your current location."));
        }
      },
      { timeout: 10000 }
    );
  });
}

// --- Main Handlers ---
async function handleSearch(cityOverride) {
  const city = (typeof cityOverride === "string" ? cityOverride : cityInput.value).trim();
  clearSuggestions();

  if (!city) {
    showError("Please enter a city name.");
    return;
  }

  clearError();
  setLoading(true);

  try {
    const weatherData = await fetchWeather(city);
    displayWeather(weatherData, city);
  } catch (error) {
    showError(error.message || "Something went wrong while fetching weather.");
  } finally {
    setLoading(false);
  }
}

// --- Event Listeners ---
searchBtn.addEventListener("click", () => {
  handleSearch();
});

cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleSearch();
  }
});

cityInput.addEventListener("input", () => {
  const query = cityInput.value.trim();
  clearTimeout(suggestionTimeoutId);

  if (query.length < 2) {
    clearSuggestions();
    return;
  }

  suggestionTimeoutId = setTimeout(async () => {
    try {
      const matches = await fetchSuggestions(query);
      if (cityInput.value.trim() === query) {
        renderSuggestions(matches);
      }
    } catch {
      clearSuggestions();
    }
  }, 250);
});

cityInput.addEventListener("blur", () => {
  setTimeout(() => clearSuggestions(), 120);
});

if (locationBtn) {
  locationBtn.addEventListener("click", async () => {
    clearSuggestions();
    clearError();
    setLoading(true);

    try {
      const coordsQuery = await getCurrentCoordinates();
      const weatherData = await fetchWeather(coordsQuery);

      cityInput.value = weatherData.location?.name || coordsQuery;
      displayWeather(weatherData, weatherData.location?.name || coordsQuery);
    } catch (error) {
      showError(error.message || "Could not get weather for your location.");
    } finally {
      setLoading(false);
    }
  });
}

if (unitToggleBtn) {
  unitToggleBtn.addEventListener("click", () => {
    useFahrenheit = !useFahrenheit;
    if (latestWeatherData) {
      renderWeather(latestWeatherData);
    }
  });
}

// --- Initialization ---
const savedCity = localStorage.getItem("lastCity");
if (savedCity) {
  cityInput.value = savedCity;
  handleSearch(savedCity);
}
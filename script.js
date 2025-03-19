// --- START OF FILE script.js --- (Complete and Correct Code)

// API key and base URL
const API_KEY = "64f60853740a1ee3ba20d0fb595c97d5";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_URL = "https://api.openweathermap.org/geo/1.0"; // For reverse geocoding // For reverse geocoding

// State
let currentCity = null; // Initialize currentCity as null.  Important!
let units = "metric";
let forecastDataGlobal = null;
let currentWeatherGlobal = null;
let timeFormat = "24"; // Default time format

// Translations (only English)
const translations = {
  en: {
    searchPlaceholder: "Search for a city...",
    realFeel: "Real Feel",
    humidity: "Humidity",
    wind: "Wind",
    pressure: "Pressure",
    sunrise: "Sunrise",
    sunset: "Sunset",
    precipitation: "Precipitation",
    "5dayForecast": "5-Day Forecast",
    theme: "Theme",
    lightTheme: "Light",
    darkTheme: "Dark",
    chatbot: "Chatbot",
    settings: "Settings",
    temperature: "Temperature",
    celsius: "Celsius",
    fahrenheit: "Fahrenheit",
    location: "Location",
    timeFormat: "Time Format", // Added translation for time format
  },
};
let language = "en"; // Set language to English

// Selectors (include new selectors, remove old ones)
const cityElement = document.querySelector(".weather__city");
const datetimeElement = document.querySelector(".weather__datetime");
const forecastElement = document.querySelector(".weather__forecast");
const temperatureElement = document.querySelector(".weather__temperature");
const iconElement = document.querySelector(".weather__icon");
const minmaxElement = document.querySelector(".weather__minmax");
const realFeelElement = document.querySelector(".weather__realfeel__value");
const humidityElement = document.querySelector(".weather__humidity__value");
const windElement = document.querySelector(".weather__wind__value");
const pressureElement = document.querySelector(".weather__pressure__value");
const sunriseElement = document.querySelector(".weather__sunrise__value");
const sunsetElement = document.querySelector(".weather__sunset__value");
const precipitationElement = document.querySelector(
  ".weather__precipitation__value"
);
const searchForm = document.querySelector(".weather__search");
const searchInput = document.querySelector(".weather__searchform");
const searchButton = document.querySelector(".weather__searchbutton");
const forecastContainer = document.querySelector(".forecast__container");
const geolocationButton = document.getElementById("geolocation-button");
const suggestionsList = document.querySelector(".suggestions-list");
const clearButton = document.getElementById("clear-button");
const sunriseContainer = document.querySelector(".weather__sunrise");
const sunsetContainer = document.querySelector(".weather__sunset");
const settingsButton = document.getElementById("settings-button");
const settingsDropdown = document.querySelector(".settings-dropdown");
const logoButton = document.getElementById("logo-button"); // Add logo button selector

// --- Event Listeners ---
searchForm.addEventListener("submit", handleSearch);
searchButton.addEventListener("click", handleSearch);
geolocationButton.addEventListener("click", getGeolocation); // Keep, but modify
searchInput.addEventListener("input", debounce(handleInput, 300));
suggestionsList.addEventListener("click", handleSuggestionClick);
clearButton.addEventListener("click", clearInput);
settingsButton.addEventListener("click", toggleSettings);

// Event listeners for settings options (delegation is fine here)
document
  .querySelectorAll(".weather_unit_celsius, .weather_unit_fahrenheit")
  .forEach((button) => {
    button.addEventListener("click", handleUnitToggle);
  });
document.querySelectorAll(".theme-option").forEach((button) => {
  button.addEventListener("click", setTheme);
});
// Add event listener for time format options
document.querySelectorAll(".time-format-option").forEach((button) => {
  button.addEventListener("click", handleTimeFormatChange);
});
// Add event listener for logo button
logoButton.addEventListener("click", () => {
  window.location.href = window.location.origin; // Reload without query params
});

// --- Settings Dropdown Toggle ---
function toggleSettings() {
  settingsDropdown.classList.toggle("show-settings");
}

// --- Theme Switching ---
function setTheme(e) {
  const theme = e.currentTarget.dataset.theme;
  document.body.classList.remove("dark-theme", "light-theme");
  document.body.classList.add(`${theme}-theme`);
  localStorage.setItem("theme", theme);

  // Add/remove 'active-theme' class.
  document.querySelectorAll(".theme-option").forEach((btn) => {
    btn.classList.remove("active-option");
  });
  e.currentTarget.classList.add("active-option");
}

// --- Time Format Change ---
function handleTimeFormatChange(e) {
  const newTimeFormat = e.currentTarget.dataset.timeFormat;
  if (timeFormat !== newTimeFormat) {
    timeFormat = newTimeFormat;
    localStorage.setItem("timeFormat", timeFormat); // Save to localStorage

    document.querySelectorAll(".time-format-option").forEach((btn) => {
      btn.classList.remove("active-option");
    });
    e.currentTarget.classList.add("active-option");

    // Refresh the display with the new time format.
    if (currentWeatherGlobal) {
      updateCurrentWeather(currentWeatherGlobal, currentCity);
    }
    if (forecastDataGlobal) {
      updateForecast(forecastDataGlobal);
    }
  }
}

// --- Autocomplete Functions ---
let currentSuggestions = [];

async function fetchSuggestions(query) {
  if (query.length < 2) {
    clearSuggestions();
    return [];
  }

  const url = `${GEO_URL}/direct?q=${query}&limit=5&appid=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    clearSuggestions();
    return [];
  }
}

function displaySuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    clearSuggestions();
    return;
  }

  suggestionsList.innerHTML = suggestions
    .map(
      (suggestion) => `
      <li data-lat="${suggestion.lat}" data-lon="${suggestion.lon}">
        ${suggestion.name}, ${suggestion.state ? suggestion.state + ", " : ""}${
        suggestion.country
      }
      </li>
    `
    )
    .join("");
  suggestionsList.classList.add("show");
}

function clearSuggestions() {
  suggestionsList.innerHTML = "";
  suggestionsList.classList.remove("show");
  currentSuggestions = [];
}

function handleSuggestionClick(e) {
  const li = e.target.closest("li");
  if (!li) return;

  const lat = li.dataset.lat;
  const lon = li.dataset.lon;

  const selectedSuggestion = currentSuggestions.find(
    (suggestion) => suggestion.lat == lat && suggestion.lon == lon
  );

  if (selectedSuggestion) {
    const fullLocationName = `${selectedSuggestion.name}, ${
      selectedSuggestion.state ? selectedSuggestion.state + ", " : ""
    }${selectedSuggestion.country}`;
    currentCity = fullLocationName;
    searchInput.value = "";
    getWeatherByCoords(lat, lon, fullLocationName);
    clearSuggestions();
    updateClearButtonVisibility();
  }
}

// --- Input Handling (Debounced) ---
function handleInput() {
  const query = searchInput.value.trim();
  updateClearButtonVisibility();

  if (query.length >= 2) {
    fetchSuggestions(query).then((suggestions) => {
      currentSuggestions = suggestions;
      displaySuggestions(suggestions);
    });
  } else {
    clearSuggestions();
  }
}

// --- Clear Button Visibility ---
function updateClearButtonVisibility() {
  clearButton.style.display = searchInput.value.length > 0 ? "block" : "none";
}

// --- Utility: Debounce ---
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// --- getWeatherByCoords ---
function getWeatherByCoords(lat, lon, fullLocationName = "") {
  const currentWeatherUrl = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}&lang=${language}`;
  const forecastUrl = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}&lang=${language}`;

  Promise.all([
    fetch(currentWeatherUrl).then((res) => res.json()),
    fetch(forecastUrl).then((res) => res.json()),
  ])
    .then(([currentData, forecastData]) => {
      forecastDataGlobal = forecastData;
      currentWeatherGlobal = currentData;
      updateCurrentWeather(currentData, fullLocationName); // Pass full name here
      updateForecast(forecastData);
      showForecastForDay(0);
    })
    .catch((error) => {
      console.error("Error fetching weather data:", error);
    });
}

// --- handleSearch (Unchanged) ---
function handleSearch(e) {
  e.preventDefault();
  if (searchInput.value) {
    if (currentSuggestions.length === 0) {
      const firstWord = searchInput.value.split(",")[0].trim();
      currentCity = firstWord;
      getWeather();
    }
  }
  clearSuggestions();
  updateClearButtonVisibility();
}

// --- handleUnitToggle (Modified) ---
function handleUnitToggle(e) {
  const button = e.target.closest("button");
  if (!button) return;

  const selectedUnit = button.classList.contains("weather_unit_celsius")
    ? "metric"
    : "imperial";

  if (units !== selectedUnit) {
    units = selectedUnit;
    document
      .querySelectorAll(".weather_unit_celsius, .weather_unit_fahrenheit")
      .forEach((btn) => {
        btn.classList.remove("active-option");
      });
    button.classList.add("active-option");

    if (forecastDataGlobal) {
      const lat = forecastDataGlobal.city.coord.lat;
      const lon = forecastDataGlobal.city.coord.lon;
      getWeatherByCoords(lat, lon, currentCity);
    } else {
      // getWeather(); //Removed getWeather and added check for currentCity
      if (currentCity) {
        getWeather();
      }
    }
  }
}

// --- getWeather (Unchanged) ---
function getWeather() {
  const currentWeatherUrl = `${BASE_URL}/weather?q=${currentCity}&appid=${API_KEY}&units=${units}&lang=${language}`;
  const forecastUrl = `${BASE_URL}/forecast?q=${currentCity}&appid=${API_KEY}&units=${units}&lang=${language}`;

  Promise.all([
    fetch(currentWeatherUrl).then((res) => res.json()),
    fetch(forecastUrl).then((res) => res.json()),
  ])
    .then(([currentData, forecastData]) => {
      forecastDataGlobal = forecastData;
      currentWeatherGlobal = currentData;
      updateCurrentWeather(currentData);
      updateForecast(forecastData);
      showForecastForDay(0);
    })
    .catch((error) => {
      console.error("Error fetching weather data:", error);
    });
}

// --- updateCurrentWeather (Modified) ---
function updateCurrentWeather(
  data,
  fullLocationName = "",
  timezoneOffset = null,
  selectedIndex = 0
) {
  cityElement.textContent =
    fullLocationName || `${data.name}, ${data.sys.country}`;
  const offset = timezoneOffset !== null ? timezoneOffset : data.timezone;

  if (data.sys && data.sys.sunrise && data.sys.sunset) {
    datetimeElement.textContent = formatCurrentTimeToLocal(offset, language);
    sunriseElement.textContent = formatTimeToLocal(
      data.sys.sunrise,
      offset,
      language
    );
    sunsetElement.textContent = formatTimeToLocal(
      data.sys.sunset,
      offset,
      language
    );
    sunriseContainer.style.display = "flex";
    sunsetContainer.style.display = "flex";
  } else {
    datetimeElement.textContent = formatUTCToLocal(data.dt, offset, language);
    sunriseContainer.style.display = "none";
    sunsetContainer.style.display = "none";
  }

  forecastElement.textContent = data.weather[0].description;
  temperatureElement.textContent = `${Math.round(data.main.temp)}°${
    units === "metric" ? "C" : "F"
  }`;
  iconElement.innerHTML = `<img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png" alt="${data.weather[0].description}">`;

  if (forecastDataGlobal) {
    const dailyData = getDailyForecastData(forecastDataGlobal);
    if (dailyData && dailyData.length > selectedIndex) {
      const minTemp = Math.round(dailyData[selectedIndex].minTemp);
      const maxTemp = Math.round(dailyData[selectedIndex].maxTemp);
      minmaxElement.textContent = `Min: ${minTemp}° Max: ${maxTemp}°`;
    }
  }

  realFeelElement.textContent = `${Math.round(data.main.feels_like)}°`;
  humidityElement.textContent = `${data.main.humidity}%`;
  windElement.textContent = `${data.wind.speed} ${
    units === "metric" ? "m/s" : "mph"
  }`;
  pressureElement.textContent = `${data.main.pressure} hPa`;
  precipitationElement.textContent = data.rain
    ? `${data.rain["1h"]} mm`
    : "0 mm";
}

// --- formatUTCToLocal, formatCurrentTimeToLocal and formatTimeToLocal (Modified for Time Format) ---
function formatUTCToLocal(
  utcTimestamp,
  timezoneOffsetSeconds,
  lang,
  isTimeOnly = false
) {
  const date = new Date((utcTimestamp + timezoneOffsetSeconds) * 1000);

  const options = isTimeOnly
    ? { hour: "2-digit", minute: "2-digit", hour12: timeFormat === "12" }
    : {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: timeFormat === "12",
      };

  return date.toLocaleDateString(lang, options);
}

function formatCurrentTimeToLocal(timezoneOffsetSeconds, lang) {
  const now = new Date();
  const localTimestamp =
    Math.floor(now.getTime() / 1000) + timezoneOffsetSeconds;
  const localDate = new Date(localTimestamp * 1000);

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: timeFormat === "12",
  };

  return localDate.toLocaleDateString(lang, options);
}

function formatTimeToLocal(timestamp, timezoneOffsetSeconds, lang) {
  const date = new Date((timestamp + timezoneOffsetSeconds) * 1000);
  return date.toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12",
  });
}

// --- updateForecast (Unchanged) ---
function updateForecast(data) {
  forecastContainer.innerHTML = "";
  const now = new Date();
  const timezoneOffset = data.city.timezone;
  const dailyData = [];

  for (let i = 0; i < data.list.length; i++) {
    const item = data.list[i];
    const itemDate = new Date((item.dt + timezoneOffset) * 1000);

    const itemDay = itemDate.toISOString().split("T")[0];
    if (
      !dailyData.find(
        (existing) =>
          new Date((existing.dt + timezoneOffset) * 1000)
            .toISOString()
            .split("T")[0] === itemDay
      )
    ) {
      dailyData.push(item);
    }
  }

  const next5Days = dailyData.slice(0, 5);

  next5Days.forEach((day, index) => {
    const forecastItem = document.createElement("div");
    forecastItem.classList.add("forecast__item");
    forecastItem.setAttribute("data-index", index);
    forecastItem.addEventListener("click", () => showForecastForDay(index));

    forecastItem.innerHTML = `
      <h3>${formatDate(day.dt, data.city.timezone, true)}</h3>
      <img src="https://openweathermap.org/img/wn/${
        day.weather[0].icon
      }.png" alt="${day.weather[0].description}">
      <p>${Math.round(day.main.temp)}°${units === "metric" ? "C" : "F"}</p>
      <p>${day.weather[0].description}</p>
    `;
    forecastContainer.appendChild(forecastItem);
  });
}

// --- Helper function to get daily min/max ---
function getDailyForecastData(forecastData) {
  if (!forecastData || !forecastData.list) {
    return [];
  }

  const timezoneOffset = forecastData.city.timezone;
  const dailyData = [];

  // Group by day, considering timezone
  for (let i = 0; i < forecastData.list.length; i++) {
    const item = forecastData.list[i];
    const itemDate = new Date((item.dt + timezoneOffset) * 1000);
    const itemDay = itemDate.toISOString().split("T")[0];

    if (
      !dailyData.find(
        (existing) =>
          new Date((existing.dt + timezoneOffset) * 1000)
            .toISOString()
            .split("T")[0] === itemDay
      )
    ) {
      dailyData.push(item);
    }
  }
  const next5Days = dailyData.slice(0, 5);

  // Calculate min/max for each day
  const dailyMinMax = next5Days.map((day) => {
    const dayString = new Date((day.dt + timezoneOffset) * 1000)
      .toISOString()
      .split("T")[0];
    const daysData = forecastData.list.filter((item) => {
      const itemDate = new Date((item.dt + timezoneOffset) * 1000);
      return itemDate.toISOString().split("T")[0] === dayString;
    });

    const minTemp = Math.min(...daysData.map((item) => item.main.temp_min));
    const maxTemp = Math.max(...daysData.map((item) => item.main.temp_max));
    return {
      dt: day.dt,
      minTemp,
      maxTemp,
    };
  });

  return dailyMinMax;
}

// --- showForecastForDay (Modified) ---
function showForecastForDay(index) {
  if (!forecastDataGlobal) return;

  const timezoneOffset = forecastDataGlobal.city.timezone;
  const dailyData = [];

  // Group forecast data by day and get the current day
  for (let i = 0; i < forecastDataGlobal.list.length; i++) {
    const item = forecastDataGlobal.list[i];
    const itemDate = new Date((item.dt + timezoneOffset) * 1000);
    const itemDay = itemDate.toISOString().split("T")[0];

    if (
      !dailyData.find(
        (existing) =>
          new Date((existing.dt + timezoneOffset) * 1000)
            .toISOString()
            .split("T")[0] === itemDay
      )
    ) {
      dailyData.push(item);
    }
  }

  const next5Days = dailyData.slice(0, 5);
  const selectedDayData = next5Days[index];

  if (!selectedDayData) {
    console.error("No data for selected day.");
    return;
  }

  if (index === 0 && currentWeatherGlobal) {
    updateCurrentWeather(currentWeatherGlobal, currentCity, null, index);
  } else {
    updateCurrentWeather(selectedDayData, currentCity, timezoneOffset, index);
  }

  document.querySelectorAll(".forecast__item").forEach((item) => {
    item.classList.remove("active");
  });
  const selectedItem = document.querySelector(
    `.forecast__item[data-index="${index}"]`
  );
  if (selectedItem) {
    selectedItem.classList.add("active");
  }
}

// --- formatDate, formatTime (Modified for 12/24 hour) ---
function formatDate(timestamp, timezone, short = false) {
  const date = new Date((timestamp + timezone) * 1000);
  const options = short
    ? { weekday: "short", month: "short", day: "numeric" }
    : {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: timeFormat === "12", // Use the global timeFormat variable
      };
  return date.toLocaleDateString(language, options);
}

function formatTime(timestamp, timezone) {
  const date = new Date((timestamp + timezone) * 1000);
  return date.toLocaleTimeString(language, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12", // Use the global timeFormat variable
  });
}

// --- updateLanguage (Modified) ---
function updateLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (translations[language] && translations[language][key] !== undefined) {
      element.textContent = translations[language][key];
    }
  });
  searchInput.placeholder = translations[language].searchPlaceholder;

  // Update chatbot translate
  if (translations[language].chatbot) {
    document.querySelector(".chatbot-button span").textContent =
      translations[language].chatbot;
  }
  // Update settings button text
  if (translations[language].settings) {
    document.querySelector(".settings-button-text").textContent =
      translations[language].settings;
  }

  if (translations[language].location) {
    //Added translate
    document.querySelector("#geolocation-button span").textContent =
      translations[language].location;
  }

  if (translations[language].theme) {
    document.querySelector(".setting-option:nth-child(2) > span").textContent =
      translations[language].theme;
  }

  if (translations[language].lightTheme) {
    document.querySelector(
      '.theme-option[data-theme="light"] span'
    ).textContent = translations[language].lightTheme;
  }
  if (translations[language].darkTheme) {
    document.querySelector(
      '.theme-option[data-theme="dark"] span'
    ).textContent = translations[language].darkTheme;
  }

  if (translations[language].celsius) {
    document.querySelector(".weather_unit_celsius span").textContent =
      translations[language].celsius;
  }
  if (translations[language].fahrenheit) {
    document.querySelector(".weather_unit_fahrenheit span").textContent =
      translations[language].fahrenheit;
  }

  //Time format translate
  if (translations[language].timeFormat) {
    document.querySelector(".setting-option:nth-child(3) > span").textContent =
      translations[language].timeFormat;
  }
}

// --- getGeolocation (Modified to run on load) ---
function getGeolocation(onLoad = false) {
  // Add an optional parameter
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Use reverse geocoding to get detailed address
        const geoReverseUrl = `${GEO_URL}/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`;
        fetch(geoReverseUrl)
          .then((res) => res.json())
          .then((geoData) => {
            if (geoData && geoData.length > 0) {
              const locationData = geoData[0];
              const fullLocationName = [
                locationData.name,
                locationData.state, // State/region
                locationData.country,
              ]
                .filter(Boolean)
                .join(", "); // Important:  Join with commas, handle missing parts

              currentCity = fullLocationName; // Update currentCity
              getWeatherByCoords(latitude, longitude, fullLocationName); // Pass full name
            } else {
              console.error("No location data found.");
              if (onLoad) {
                // Only show alert if it's on load
                alert(
                  "Could not retrieve location details.  Please search manually."
                );
              }
              // No fallback needed, as it's on load. We don't want to call getWeatherByCoords
            }
          })
          .catch((error) => {
            console.error("Error in reverse geocoding:", error);
            if (onLoad) {
              // Only show alert if it's on load
              alert(
                "Unable to retrieve your location details.  Please search manually."
              );
            }
            // No fallback, for the same reason as above.
          });
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        if (onLoad) {
          // Only show alert if it is on load
          alert(
            "Unable to retrieve your location. Please search for a city manually."
          );
        }
      }
    );
  } else {
    if (onLoad) {
      // Only show alert if it is on load
      alert(
        "Geolocation is not supported by your browser. Please search for a city manually."
      );
    }
  }
}

function clearInput() {
  searchInput.value = "";
  clearSuggestions();
  updateClearButtonVisibility();
  searchInput.focus();
}

// --- initApp (Modified) ---
function initApp() {
  const savedTheme = localStorage.getItem("theme");
  const savedTimeFormat = localStorage.getItem("timeFormat");

  if (savedTheme) {
    document.body.classList.remove("dark-theme", "light-theme");
    document.body.classList.add(`${savedTheme}-theme`);

    document.querySelectorAll(".theme-option").forEach((button) => {
      if (button.dataset.theme === savedTheme) {
        button.classList.add("active-option");
      } else {
        button.classList.remove("active-option");
      }
    });
  } else {
    document.body.classList.add("light-theme");
    document
      .querySelector('.theme-option[data-theme="light"]')
      .classList.add("active-option");
  }

  // Initialize unit buttons.
  document
    .querySelectorAll(".weather_unit_celsius, .weather_unit_fahrenheit")
    .forEach((button) => {
      button.classList.remove("active-option"); // Remove from all first
    });
  if (units === "metric") {
    document
      .querySelector(".weather_unit_celsius")
      .classList.add("active-option");
  } else {
    document
      .querySelector(".weather_unit_fahrenheit")
      .classList.add("active-option");
  }

  // Initialize time format buttons
  document.querySelectorAll(".time-format-option").forEach((button) => {
    button.classList.remove("active-option");
  });
  if (savedTimeFormat) {
    timeFormat = savedTimeFormat;
    document
      .querySelector(`.time-format-option[data-time-format="${timeFormat}"]`)
      .classList.add("active-option");
  } else {
    document
      .querySelector(`.time-format-option[data-time-format="${timeFormat}"]`)
      .classList.add("active-option");
  }

  updateLanguage();
  // getWeather(); // Removed direct call to getWeather.
  getGeolocation(true); // Call getGeolocation with onLoad = true
  updateClearButtonVisibility();
}

initApp();

// Add this code to your JavaScript file

document.addEventListener("DOMContentLoaded", function () {
  // Variables for settings menu
  const settingsButton = document.querySelector(".settings-button");
  const settingsDropdown = document.querySelector(".settings-dropdown");
  let isSettingsOpen = false;

  // Toggle settings dropdown when clicked
  settingsButton.addEventListener("click", function (e) {
    e.stopPropagation(); // Prevent the click from immediately closing the menu

    if (isSettingsOpen) {
      settingsDropdown.classList.remove("show-settings");
      isSettingsOpen = false;
    } else {
      settingsDropdown.classList.add("show-settings");
      isSettingsOpen = true;
    }
  });

  // Close settings dropdown when clicking anywhere else on the page
  document.addEventListener("click", function (e) {
    // If the click is outside the settings dropdown and the settings button
    if (
      !settingsDropdown.contains(e.target) &&
      !settingsButton.contains(e.target)
    ) {
      settingsDropdown.classList.remove("show-settings");
      isSettingsOpen = false;
    }
  });

  // Prevent settings dropdown from closing when clicking inside it
  settingsDropdown.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  // Add touch event listeners for mobile devices
  document.addEventListener(
    "touchstart",
    function (e) {
      if (
        !settingsDropdown.contains(e.target) &&
        !settingsButton.contains(e.target)
      ) {
        settingsDropdown.classList.remove("show-settings");
        isSettingsOpen = false;
      }
    },
    { passive: true }
  );
});

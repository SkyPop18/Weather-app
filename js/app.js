(() => {
  'use strict';

  const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
  const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

  const state = {
    unit: 'celsius',
    favorites: JSON.parse(localStorage.getItem('clay_weather_favs') || '[]'),
    currentCity: null,
    currentLat: null,
    currentLon: null,
    weatherData: null,
  };

  const $ = (id) => document.getElementById(id);

  const dom = {
    searchForm: $('search-form'),
    searchInput: $('search-input'),
    searchError: $('search-error'),
    errorText: $('error-text'),
    locationBtn: $('location-button'),
    unitToggle: $('unit-toggle'),
    dateText: $('date-text'),
    timeText: $('time-text'),
    loadingSection: $('loading-section'),
    weatherContent: $('weather-content'),
    welcomeSection: $('welcome-section'),
    favoritesSection: $('favorites-section'),
    favoritesList: $('favorites-list'),
    favoriteBtn: $('favorite-btn'),
    favStarPath: $('fav-star-path'),
    cityName: $('city-name'),
    weatherDate: $('weather-date'),
    weatherIconWrap: $('weather-icon-wrap'),
    currentTemp: $('current-temp'),
    currentCondition: $('current-condition'),
    feelsLike: $('feels-like'),
    statHumidity: $('stat-humidity-value'),
    statWind: $('stat-wind-value'),
    statVisibility: $('stat-visibility-value'),
    statPressure: $('stat-pressure-value'),
    forecastGrid: $('forecast-grid'),
  };

  function formatTemp(celsius) {
    if (state.unit === 'fahrenheit') {
      return `${Math.round(celsius * 9 / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  }

  function formatWindSpeed(kmh) {
    if (state.unit === 'fahrenheit') {
      return `${Math.round(kmh * 0.621371)} mph`;
    }
    return `${Math.round(kmh)} km/h`;
  }

  function formatVisibility(meters) {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  }

  function getDayName(dateStr, short = false, timezone = null) {

    const todayStr = timezone
      ? new Date().toLocaleDateString('en-CA', { timeZone: timezone })
      : new Date().toISOString().slice(0, 10);

    const todayParts = todayStr.split('-').map(Number);
    const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return short ? 'Tmrw' : 'Tomorrow';

    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: short ? 'short' : 'short' });
  }

  function updateDateTime() {
    const now = new Date();
    dom.dateText.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric',
    });
    dom.timeText.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  setInterval(updateDateTime, 1000);
  updateDateTime();

  function showLoading() {
    dom.welcomeSection.hidden = true;
    dom.weatherContent.hidden = true;
    dom.searchError.hidden = true;
    dom.loadingSection.hidden = false;
  }

  function showWeather() {
    dom.loadingSection.hidden = true;
    dom.welcomeSection.hidden = true;
    dom.weatherContent.hidden = false;
  }

  function showWelcome() {
    dom.loadingSection.hidden = true;
    dom.weatherContent.hidden = true;
    dom.welcomeSection.hidden = false;
  }

  function showError(msg) {
    dom.errorText.textContent = msg;
    dom.searchError.hidden = false;

    dom.searchError.style.animation = 'none';

    void dom.searchError.offsetHeight;
    dom.searchError.style.animation = '';
  }

  function hideError() {
    dom.searchError.hidden = true;
  }

  function saveFavorites() {
    localStorage.setItem('clay_weather_favs', JSON.stringify(state.favorites));
  }

  function isFavorite(cityName) {
    return state.favorites.some(f => f.name.toLowerCase() === cityName.toLowerCase());
  }

  function updateFavoriteButton() {
    if (!state.currentCity) return;
    const fav = isFavorite(state.currentCity);
    dom.favoriteBtn.classList.toggle('is-favorite', fav);
    dom.favoriteBtn.setAttribute('aria-label', fav ? 'Remove from favorites' : 'Add to favorites');
    dom.favoriteBtn.setAttribute('title', fav ? 'Remove from favorites' : 'Add to favorites');
  }

  function renderFavorites() {
    if (state.favorites.length === 0) {
      dom.favoritesSection.hidden = true;
      return;
    }
    dom.favoritesSection.hidden = false;
    dom.favoritesList.innerHTML = state.favorites.map((fav, i) => `
      <button class="fav-chip" data-index="${i}" data-lat="${fav.lat}" data-lon="${fav.lon}" data-name="${fav.name}" aria-label="View weather for ${fav.name}">
        ${fav.name}
        <span class="fav-remove" data-remove="${i}" aria-label="Remove ${fav.name}" title="Remove">✕</span>
      </button>
    `).join('');
  }

  dom.favoritesList.addEventListener('click', (e) => {
    const removeIdx = e.target.closest('[data-remove]');
    if (removeIdx) {
      e.stopPropagation();
      const idx = parseInt(removeIdx.dataset.remove);
      state.favorites.splice(idx, 1);
      saveFavorites();
      renderFavorites();
      updateFavoriteButton();
      return;
    }
    const chip = e.target.closest('.fav-chip');
    if (chip) {
      const lat = parseFloat(chip.dataset.lat);
      const lon = parseFloat(chip.dataset.lon);
      const name = chip.dataset.name;
      fetchWeather(lat, lon, name);
    }
  });

  dom.favoriteBtn.addEventListener('click', () => {
    if (!state.currentCity) return;
    if (isFavorite(state.currentCity)) {
      state.favorites = state.favorites.filter(
        f => f.name.toLowerCase() !== state.currentCity.toLowerCase()
      );
    } else {
      state.favorites.push({
        name: state.currentCity,
        lat: state.currentLat,
        lon: state.currentLon,
      });
    }
    saveFavorites();
    renderFavorites();
    updateFavoriteButton();
  });

  function updateUnitLabels() {
    const isF = state.unit === 'fahrenheit';
    dom.unitToggle.setAttribute('aria-checked', String(isF));
    dom.unitToggle.querySelector('.unit-c').classList.toggle('active', !isF);
    dom.unitToggle.querySelector('.unit-f').classList.toggle('active', isF);
  }

  dom.unitToggle.addEventListener('click', () => {
    state.unit = state.unit === 'celsius' ? 'fahrenheit' : 'celsius';
    localStorage.setItem('clay_weather_unit', state.unit);
    updateUnitLabels();
    if (state.weatherData) {
      renderWeatherData(state.weatherData, state.currentCity);
    }
  });

  dom.unitToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dom.unitToggle.click();
    }
  });

  const savedUnit = localStorage.getItem('clay_weather_unit');
  if (savedUnit) state.unit = savedUnit;
  updateUnitLabels();

  dom.searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = dom.searchInput.value.trim();
    if (!query) return;
    hideError();
    await searchCity(query);
  });

  async function searchCity(query) {
    showLoading();
    try {
      const res = await fetch(`${GEO_API}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      if (!res.ok) throw new Error('Geocoding API error');
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        showWelcome();
        showError(`City "${query}" not found. Please try again.`);
        return;
      }

      const city = data.results[0];
      const name = [city.name, city.admin1, city.country].filter(Boolean).join(', ');
      await fetchWeather(city.latitude, city.longitude, name);
    } catch (err) {
      console.error(err);
      showWelcome();
      showError('Failed to search. Please check your connection and try again.');
    }
  }

  dom.locationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser.');
      return;
    }
    hideError();
    showLoading();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await fetch(`${GEO_API}?name=&latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`);
          let cityName = 'Your Location';

          await fetchWeather(latitude, longitude, cityName);

          reverseGeocode(latitude, longitude);
        } catch {
          await fetchWeather(latitude, longitude, 'Your Location');
        }
      },
      (err) => {
        showWelcome();
        const messages = {
          1: 'Location access denied. Please allow location access or search manually.',
          2: 'Unable to determine your location.',
          3: 'Location request timed out.',
        };
        showError(messages[err.code] || 'Unable to get your location.');
      },
      { timeout: 10000 }
    );
  });

  async function reverseGeocode(lat, lon) {

    try {

      const res = await fetch(`${GEO_API}?name=${encodeURIComponent(`${lat.toFixed(1)},${lon.toFixed(1)}`)}&count=1&language=en&format=json`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const city = data.results[0];
        const name = [city.name, city.admin1, city.country].filter(Boolean).join(', ');
        state.currentCity = name;
        dom.cityName.textContent = name;
        updateFavoriteButton();
      }
    } catch {

    }
  }

  async function fetchWeather(lat, lon, cityName) {
    showLoading();
    hideError();

    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min',
        timezone: 'auto',
        forecast_days: '7',
      });

      const res = await fetch(`${WEATHER_API}?${params}`);
      if (!res.ok) throw new Error('Weather API error');
      const data = await res.json();

      state.currentCity = cityName;
      state.currentLat = lat;
      state.currentLon = lon;
      state.weatherData = data;

      renderWeatherData(data, cityName);
      showWeather();
    } catch (err) {
      console.error(err);
      showWelcome();
      showError('Failed to fetch weather data. Please try again later.');
    }
  }

  function renderWeatherData(data, cityName) {
    const current = data.current;
    const daily = data.daily;

    dom.cityName.textContent = cityName;
    const now = new Date();
    dom.weatherDate.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    dom.weatherIconWrap.innerHTML = WeatherIcons.getIconForCode(current.weather_code);

    const category = WeatherIcons.getWeatherCategory(current.weather_code);
    document.body.setAttribute('data-weather', category);
    if (window.weatherEffects) {
      window.weatherEffects.setWeather(category);
    }

    dom.currentTemp.textContent = formatTemp(current.temperature_2m);
    dom.currentCondition.textContent = WeatherIcons.getConditionText(current.weather_code);
    dom.feelsLike.textContent = `Feels like ${formatTemp(current.apparent_temperature)}`;

    dom.statHumidity.textContent = `${current.relative_humidity_2m}%`;
    dom.statWind.textContent = formatWindSpeed(current.wind_speed_10m);
    dom.statVisibility.textContent = formatVisibility(current.visibility);
    dom.statPressure.textContent = `${Math.round(current.surface_pressure)} hPa`;

    renderForecast(daily, data.timezone);

    updateFavoriteButton();
  }

  function renderForecast(daily, timezone) {
    dom.forecastGrid.innerHTML = '';

    for (let i = 0; i < daily.time.length; i++) {
      const card = document.createElement('div');
      card.className = 'forecast-card clay-card';
      card.style.animationDelay = `${i * 0.06}s`;
      card.innerHTML = `
        <div class="forecast-day">${getDayName(daily.time[i], true, timezone)}</div>
        <div class="forecast-icon">${WeatherIcons.getIconForCode(daily.weather_code[i])}</div>
        <div class="forecast-temps">
          <span class="forecast-high">${formatTemp(daily.temperature_2m_max[i])}</span>
          <span class="forecast-low">${formatTemp(daily.temperature_2m_min[i])}</span>
        </div>
        <div class="forecast-condition">${WeatherIcons.getConditionText(daily.weather_code[i])}</div>
      `;
      dom.forecastGrid.appendChild(card);
    }
  }

  function init() {
    renderFavorites();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          await fetchWeather(latitude, longitude, 'Your Location');
          reverseGeocode(latitude, longitude);
        },
        () => {

          showWelcome();
        },
        { timeout: 5000 }
      );
    } else {
      showWelcome();
    }
  }

  init();
})();

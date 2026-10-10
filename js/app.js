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

    // Store previous numeric values for counting animations
    prevTemp: 0,
    prevFeelsLike: 0,
    prevHumidity: 0,
    prevWind: 0,
    prevVisibility: 0,
    prevPressure: 0,
  };

  // Used by the AI panel. It deliberately exposes only the active location and
  // weather data that the user can already see in the dashboard.
  window.getClayWeatherContext = () => {
    if (!state.weatherData || !state.currentCity) return null;
    const current = state.weatherData.current;
    const daily = state.weatherData.daily;
    return {
      location: state.currentCity,
      coordinates: { latitude: state.currentLat, longitude: state.currentLon },
      unit: state.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius',
      current: {
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        pressure: current.surface_pressure,
        visibility: current.visibility,
        condition: WeatherIcons.getConditionText(current.weather_code),
        observedAt: current.time
      },
      forecast: daily.time.map((date, index) => ({
        date,
        condition: WeatherIcons.getConditionText(daily.weather_code[index]),
        high: daily.temperature_2m_max[index],
        low: daily.temperature_2m_min[index]
      }))
    };
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

    // Autocomplete dropdown elements
    autocompleteDropdown: $('autocomplete-dropdown'),
    autocompleteLoading: $('autocomplete-loading'),
    autocompleteList: $('autocomplete-list'),
  };

  // Cache unit label references (avoid repeated querySelector in updateUnitLabels)
  const unitLabelC = dom.unitToggle.querySelector('.unit-c');
  const unitLabelF = dom.unitToggle.querySelector('.unit-f');

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

  // Cached Intl formatters — avoids expensive locale lookups on every call
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  function updateDateTime() {
    const now = new Date();
    dom.dateText.textContent = dateFmt.format(now);
    dom.timeText.textContent = timeFmt.format(now);
  }

  // 60s is sufficient — minute-level precision for a weather app
  let dateTimeInterval = setInterval(updateDateTime, 60000);
  updateDateTime();

  // Pause datetime updates when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(dateTimeInterval);
    } else {
      updateDateTime();
      dateTimeInterval = setInterval(updateDateTime, 60000);
    }
  });

  // --- GSAP Lifecycle & Helpers ---
  let activeTimeline = null;

  function isReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function animateContentOut() {
    return new Promise((resolve) => {
      if (isReducedMotion()) {
        resolve();
        return;
      }

      if (activeTimeline) {
        activeTimeline.kill();
      }

      const activeSection = !dom.weatherContent.hidden ? dom.weatherContent :
                            (!dom.welcomeSection.hidden ? dom.welcomeSection : null);

      if (!activeSection) {
        resolve();
        return;
      }

      activeTimeline = gsap.timeline({
        onComplete: () => {
          activeTimeline = null;
          resolve();
        }
      });

      activeTimeline.to(activeSection, {
        opacity: 0,
        y: -30,
        duration: 0.4,
        ease: 'power3.in',
      });
    });
  }

  function animateLoadingOut() {
    return new Promise((resolve) => {
      if (isReducedMotion() || dom.loadingSection.hidden) {
        resolve();
        return;
      }

      if (activeTimeline) {
        activeTimeline.kill();
      }

      activeTimeline = gsap.timeline({
        onComplete: () => {
          activeTimeline = null;
          resolve();
        }
      });

      activeTimeline.to(dom.loadingSection, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: 'power3.in',
      });
    });
  }

  function animateWeatherContentEntrance() {
    if (isReducedMotion()) {
      dom.weatherContent.style.opacity = 1;
      dom.weatherContent.style.transform = 'none';
      return;
    }

    if (activeTimeline) {
      activeTimeline.kill();
    }

    // Set initial states
    gsap.set(dom.weatherContent, { opacity: 0, y: 30 });
    gsap.set('.current-main', { opacity: 0, y: 30 });
    gsap.set('.stat-card', { opacity: 0, y: 20 });
    gsap.set('#forecast-section .section-title', { opacity: 0, y: 15 });
    gsap.set('.forecast-card', { opacity: 0, y: 20 });

    activeTimeline = gsap.timeline({
      defaults: { ease: 'power3.out', duration: 0.6 },
      onComplete: () => {
        activeTimeline = null;
        gsap.set([dom.weatherContent, '.current-main', '.stat-card', '#forecast-section .section-title', '.forecast-card'], { clearProps: 'transform,will-change' });
      }
    });

    activeTimeline.to(dom.weatherContent, { opacity: 1, y: 0, duration: 0.3 })
      .to('.current-main', { opacity: 1, y: 0, willChange: 'transform,opacity' }, '-=0.15')
      .to('.stat-card', { opacity: 1, y: 0, stagger: 0.05, willChange: 'transform,opacity' }, '-=0.3')
      .to('#forecast-section .section-title', { opacity: 1, y: 0, willChange: 'transform,opacity' }, '-=0.2')
      .to('.forecast-card', { opacity: 1, y: 0, stagger: 0.04, willChange: 'transform,opacity' }, '-=0.3');
  }

  function animateWelcomeEntrance() {
    if (isReducedMotion()) {
      dom.welcomeSection.style.opacity = 1;
      dom.welcomeSection.style.transform = 'none';
      return;
    }

    if (activeTimeline) {
      activeTimeline.kill();
    }

    gsap.set(dom.welcomeSection, { opacity: 0, y: 30 });

    activeTimeline = gsap.timeline({
      defaults: { ease: 'power3.out', duration: 0.6 },
      onComplete: () => {
        activeTimeline = null;
        gsap.set(dom.welcomeSection, { clearProps: 'transform,will-change' });
      }
    });

    activeTimeline.to(dom.welcomeSection, { opacity: 1, y: 0, duration: 0.5, willChange: 'transform,opacity' });
  }

  function animateLoadingEntrance() {
    if (isReducedMotion()) {
      dom.loadingSection.style.opacity = 1;
      dom.loadingSection.style.transform = 'none';
      return;
    }

    if (activeTimeline) {
      activeTimeline.kill();
    }

    gsap.set(dom.loadingSection, { opacity: 0, y: 20 });

    activeTimeline = gsap.timeline({
      defaults: { ease: 'power3.out', duration: 0.4 },
      onComplete: () => {
        activeTimeline = null;
        gsap.set(dom.loadingSection, { clearProps: 'transform,will-change' });
      }
    });

    activeTimeline.to(dom.loadingSection, { opacity: 1, y: 0, willChange: 'transform,opacity' });
  }

  function animateNumber(element, start, end, duration, formatFn) {
    if (isReducedMotion()) {
      element.textContent = formatFn(end);
      return;
    }

    const obj = { val: start };
    gsap.to(obj, {
      val: end,
      duration: duration,
      ease: 'power2.out',
      onUpdate: () => {
        element.textContent = formatFn(obj.val);
      }
    });
  }

  // --- Display state toggle functions ---
  function showLoading() {
    dom.welcomeSection.hidden = true;
    dom.weatherContent.hidden = true;
    dom.searchError.hidden = true;
    dom.loadingSection.hidden = false;
    animateLoadingEntrance();
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
    animateWelcomeEntrance();
  }

  // --- Location Autocomplete Module ---
  let debounceTimeout = null;
  const autocompleteCache = new Map();
  let autocompleteController = null;
  let activeIndex = -1;

  function clearAutocomplete() {
    dom.autocompleteDropdown.hidden = true;
    dom.autocompleteList.innerHTML = '';
    dom.autocompleteLoading.hidden = true;
    dom.searchInput.setAttribute('aria-expanded', 'false');
    dom.searchInput.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    if (autocompleteController) {
      autocompleteController.abort();
      autocompleteController = null;
    }
  }

  async function fetchAutocomplete(query) {
    if (autocompleteController) {
      autocompleteController.abort();
    }
    autocompleteController = new AbortController();
    const signal = autocompleteController.signal;

    const cached = autocompleteCache.get(query.toLowerCase());
    const now = Date.now();
    if (cached && (now - cached.timestamp < 5 * 60 * 1000)) {
      return cached.results;
    }

    dom.autocompleteLoading.hidden = false;
    dom.autocompleteDropdown.hidden = false;
    dom.autocompleteList.innerHTML = '';

    try {
      const res = await fetch(`${GEO_API}?name=${encodeURIComponent(query)}&count=10&language=en&format=json`, { signal });
      if (!res.ok) throw new Error('Geocoding autocomplete network error');
      const data = await res.json();
      const results = data.results || [];

      const seen = new Set();
      const uniqueResults = [];
      for (const item of results) {
        const formattedName = [item.name, item.admin1, item.country].filter(Boolean).join(', ');
        if (!seen.has(formattedName)) {
          seen.add(formattedName);
          uniqueResults.push(item);
        }
      }

      autocompleteCache.set(query.toLowerCase(), {
        results: uniqueResults,
        timestamp: now
      });

      return uniqueResults;
    } catch (err) {
      if (err.name === 'AbortError') {
        return null;
      }
      console.error('Autocomplete fetch failed:', err);
      throw err;
    } finally {
      if (!signal.aborted) {
        dom.autocompleteLoading.hidden = true;
      }
    }
  }

  function highlightText(text, query) {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    const match = text.substring(index, index + query.length);
    return `${text.substring(0, index)}<span class="match-highlight">${match}</span>${text.substring(index + query.length)}`;
  }

  function renderAutocompleteDropdown(results, query) {
    dom.autocompleteList.innerHTML = '';
    activeIndex = -1;

    if (!results || results.length === 0) {
      dom.autocompleteList.innerHTML = `<li class="autocomplete-empty">No locations found</li>`;
      dom.searchInput.setAttribute('aria-expanded', 'true');
      return;
    }

    // Build all items as a single HTML string and set innerHTML once
    const pinIcon = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="opacity: 0.7;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>`;

    dom.autocompleteList.innerHTML = results.map((item, index) => {
      const name = [item.name, item.admin1, item.country].filter(Boolean).join(', ');
      return `<li class="autocomplete-item" id="autocomplete-item-${index}" role="option" aria-selected="false" data-index="${index}" data-lat="${item.latitude}" data-lon="${item.longitude}" data-name="${name}">${pinIcon}<span>${highlightText(name, query)}</span></li>`;
    }).join('');

    dom.searchInput.setAttribute('aria-expanded', 'true');
  }

  function updateActiveItem(items) {
    items.forEach((item, index) => {
      if (index === activeIndex) {
        item.classList.add('active');
        item.setAttribute('aria-selected', 'true');
        dom.searchInput.setAttribute('aria-activedescendant', item.id);
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
      }
    });
  }

  // --- Autocomplete Event Listeners & Document click-outside ---
  // Delegate autocomplete item clicks to the list (avoid per-item listeners)
  dom.autocompleteList.addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (!item) return;
    const lat = parseFloat(item.dataset.lat);
    const lon = parseFloat(item.dataset.lon);
    const name = item.dataset.name;
    dom.searchInput.value = name;
    clearAutocomplete();
    fetchWeather(lat, lon, name);
  });

  dom.searchInput.addEventListener('input', () => {
    const query = dom.searchInput.value.trim();

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    if (query.length < 3) {
      clearAutocomplete();
      return;
    }

    debounceTimeout = setTimeout(async () => {
      try {
        const results = await fetchAutocomplete(query);
        if (results !== null) {
          renderAutocompleteDropdown(results, query);
        }
      } catch (err) {
        clearAutocomplete();
      }
    }, 300);
  });

  dom.searchInput.addEventListener('keydown', (e) => {
    const items = dom.autocompleteList.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        const selected = items[activeIndex];
        const lat = parseFloat(selected.dataset.lat);
        const lon = parseFloat(selected.dataset.lon);
        const name = selected.dataset.name;
        dom.searchInput.value = name;
        clearAutocomplete();
        fetchWeather(lat, lon, name);
      }
    } else if (e.key === 'Escape') {
      clearAutocomplete();
    }
  });

  document.addEventListener('click', (e) => {
    if (!dom.searchForm.contains(e.target)) {
      clearAutocomplete();
    }
  });

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
    unitLabelC.classList.toggle('active', !isF);
    unitLabelF.classList.toggle('active', isF);
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
    clearAutocomplete();
    hideError();
    await animateContentOut();
    showLoading();
    try {
      const res = await fetch(`${GEO_API}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      if (!res.ok) throw new Error('Geocoding API error');
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        await animateLoadingOut();
        showWelcome();
        showError(`City "${query}" not found. Please try again.`);
        return;
      }

      const city = data.results[0];
      const name = [city.name, city.admin1, city.country].filter(Boolean).join(', ');
      await fetchWeather(city.latitude, city.longitude, name);
    } catch (err) {
      console.error(err);
      await animateLoadingOut();
      showWelcome();
      showError('Failed to search. Please check your connection and try again.');
    }
  }

  dom.locationBtn.addEventListener('click', async () => {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser.');
      return;
    }
    clearAutocomplete();
    hideError();
    await animateContentOut();
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
      async (err) => {
        await animateLoadingOut();
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
      // Ignored
    }
  }

  async function fetchWeather(lat, lon, cityName) {
    hideError();

    const contentShown = !dom.weatherContent.hidden || !dom.welcomeSection.hidden;
    if (contentShown) {
      await animateContentOut();
    }
    showLoading();

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

      await animateLoadingOut();
      renderWeatherData(data, cityName, true);
      showWeather();
      animateWeatherContentEntrance();
      document.dispatchEvent(new CustomEvent('weather:updated'));
    } catch (err) {
      console.error(err);
      await animateLoadingOut();
      showWelcome();
      showError('Failed to fetch weather data. Please try again later.');
    }
  }

  function renderWeatherData(data, cityName, animate = true) {
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

    if (animate) {
      animateNumber(dom.currentTemp, state.prevTemp, current.temperature_2m, 0.8, formatTemp);
      animateNumber(dom.feelsLike, state.prevFeelsLike, current.apparent_temperature, 0.8, (val) => `Feels like ${formatTemp(val)}`);
      animateNumber(dom.statHumidity, state.prevHumidity, current.relative_humidity_2m, 0.8, (val) => `${Math.round(val)}%`);
      animateNumber(dom.statWind, state.prevWind, current.wind_speed_10m, 0.8, formatWindSpeed);
      animateNumber(dom.statVisibility, state.prevVisibility, current.visibility, 0.8, formatVisibility);
      animateNumber(dom.statPressure, state.prevPressure, current.surface_pressure, 0.8, (val) => `${Math.round(val)} hPa`);
    } else {
      dom.currentTemp.textContent = formatTemp(current.temperature_2m);
      dom.feelsLike.textContent = `Feels like ${formatTemp(current.apparent_temperature)}`;
      dom.statHumidity.textContent = `${current.relative_humidity_2m}%`;
      dom.statWind.textContent = formatWindSpeed(current.wind_speed_10m);
      dom.statVisibility.textContent = formatVisibility(current.visibility);
      dom.statPressure.textContent = `${Math.round(current.surface_pressure)} hPa`;
    }

    dom.currentCondition.textContent = WeatherIcons.getConditionText(current.weather_code);

    renderForecast(daily, data.timezone);
    updateFavoriteButton();

    state.prevTemp = current.temperature_2m;
    state.prevFeelsLike = current.apparent_temperature;
    state.prevHumidity = current.relative_humidity_2m;
    state.prevWind = current.wind_speed_10m;
    state.prevVisibility = current.visibility;
    state.prevPressure = current.surface_pressure;
  }

  function renderForecast(daily, timezone) {
    // Single innerHTML assignment instead of 7 createElement+appendChild calls
    const cards = [];
    for (let i = 0; i < daily.time.length; i++) {
      cards.push(`
        <div class="forecast-card clay-card">
          <div class="forecast-day">${getDayName(daily.time[i], true, timezone)}</div>
          <div class="forecast-icon">${WeatherIcons.getIconForCode(daily.weather_code[i])}</div>
          <div class="forecast-temps">
            <span class="forecast-high">${formatTemp(daily.temperature_2m_max[i])}</span>
            <span class="forecast-low">${formatTemp(daily.temperature_2m_min[i])}</span>
          </div>
          <div class="forecast-condition">${WeatherIcons.getConditionText(daily.weather_code[i])}</div>
        </div>
      `);
    }
    dom.forecastGrid.innerHTML = cards.join('');
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

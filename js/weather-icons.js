const WeatherIcons = (() => {

  const sun = () => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="30s" repeatCount="indefinite"/>
        <g stroke="#f4a261" stroke-width="3.5" stroke-linecap="round" opacity="0.7">
          <line x1="50" y1="12" x2="50" y2="22"/>
          <line x1="50" y1="78" x2="50" y2="88"/>
          <line x1="12" y1="50" x2="22" y2="50"/>
          <line x1="78" y1="50" x2="88" y2="50"/>
          <line x1="23" y1="23" x2="30" y2="30"/>
          <line x1="70" y1="70" x2="77" y2="77"/>
          <line x1="23" y1="77" x2="30" y2="70"/>
          <line x1="70" y1="30" x2="77" y2="23"/>
        </g>
      </g>
      <circle cx="50" cy="50" r="18" fill="#f4a261">
        <animate attributeName="r" values="18;19.5;18" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="44" cy="44" r="6" fill="rgba(255,255,255,0.3)"/>
    </svg>`;

  const partlyCloudy = () => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g>
        <circle cx="35" cy="38" r="14" fill="#f4a261">
          <animate attributeName="r" values="14;15;14" dur="3s" repeatCount="indefinite"/>
        </circle>
        <g stroke="#f4a261" stroke-width="2.5" stroke-linecap="round" opacity="0.5">
          <line x1="35" y1="16" x2="35" y2="22"/>
          <line x1="35" y1="54" x2="35" y2="58"/>
          <line x1="15" y1="38" x2="19" y2="38"/>
          <line x1="51" y1="38" x2="55" y2="38"/>
        </g>
      </g>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;3,0;0,0" dur="6s" repeatCount="indefinite"/>
        <ellipse cx="58" cy="60" rx="26" ry="16" fill="#d4e8df"/>
        <ellipse cx="42" cy="56" rx="18" ry="14" fill="#c0ddd0"/>
        <ellipse cx="68" cy="55" rx="16" ry="12" fill="#c8e5d5"/>
        <ellipse cx="55" cy="52" rx="14" ry="10" fill="#d8eee4"/>
      </g>
    </svg>`;

  const cloudy = () => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;4,0;0,0" dur="7s" repeatCount="indefinite"/>
        <ellipse cx="50" cy="52" rx="32" ry="18" fill="#c0ddd0"/>
        <ellipse cx="32" cy="48" rx="20" ry="16" fill="#b8d6c8"/>
        <ellipse cx="64" cy="46" rx="22" ry="14" fill="#c8e5d5"/>
        <ellipse cx="48" cy="42" rx="18" ry="12" fill="#d4ede0"/>
      </g>
      <g opacity="0.5">
        <animateTransform attributeName="transform" type="translate" values="0,0;-3,0;0,0" dur="8s" repeatCount="indefinite"/>
        <ellipse cx="55" cy="66" rx="24" ry="12" fill="#d0e4d8"/>
      </g>
    </svg>`;

  const fog = () => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.7">
        <rect x="18" y="35" rx="4" width="64" height="6" fill="#b8c8c0">
          <animate attributeName="x" values="18;22;18" dur="4s" repeatCount="indefinite"/>
        </rect>
        <rect x="22" y="48" rx="4" width="56" height="6" fill="#c8d8d0">
          <animate attributeName="x" values="22;18;22" dur="5s" repeatCount="indefinite"/>
        </rect>
        <rect x="16" y="61" rx="4" width="68" height="6" fill="#b8c8c0">
          <animate attributeName="x" values="16;20;16" dur="4.5s" repeatCount="indefinite"/>
        </rect>
        <rect x="26" y="74" rx="4" width="48" height="5" fill="#d0dcd6">
          <animate attributeName="x" values="26;22;26" dur="5.5s" repeatCount="indefinite"/>
        </rect>
      </g>
    </svg>`;

  const drizzle = () => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;3,0;0,0" dur="6s" repeatCount="indefinite"/>
        <ellipse cx="50" cy="36" rx="28" ry="16" fill="#b0c8d0"/>
        <ellipse cx="34" cy="32" rx="18" ry="14" fill="#a8c0c8"/>
        <ellipse cx="62" cy="30" rx="20" ry="12" fill="#bcd0d8"/>
      </g>
      <g opacity="0.6">
        <line x1="35" y1="56" x2="33" y2="66" stroke="#7ec8e3" stroke-width="2" stroke-linecap="round">
          <animate attributeName="y1" values="56;58;56" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="66;68;66" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite"/>
        </line>
        <line x1="50" y1="58" x2="48" y2="68" stroke="#7ec8e3" stroke-width="2" stroke-linecap="round">
          <animate attributeName="y1" values="58;60;58" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="68;70;68" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.8s" repeatCount="indefinite"/>
        </line>
        <line x1="65" y1="55" x2="63" y2="65" stroke="#7ec8e3" stroke-width="2" stroke-linecap="round">
          <animate attributeName="y1" values="55;57;55" dur="1.3s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="65;67;65" dur="1.3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.3s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`;

  const rain = () => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;2,0;0,0" dur="5s" repeatCount="indefinite"/>
        <ellipse cx="50" cy="32" rx="30" ry="18" fill="#96b0c0"/>
        <ellipse cx="32" cy="28" rx="20" ry="15" fill="#8aa4b4"/>
        <ellipse cx="66" cy="26" rx="22" ry="13" fill="#a0b8c8"/>
      </g>
      <g>
        <line x1="30" y1="52" x2="26" y2="72" stroke="#7ec8e3" stroke-width="2.5" stroke-linecap="round">
          <animate attributeName="y1" values="52;54;52" dur="0.8s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="72;76;72" dur="0.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.8s" repeatCount="indefinite"/>
        </line>
        <line x1="42" y1="54" x2="38" y2="76" stroke="#7ec8e3" stroke-width="2.5" stroke-linecap="round">
          <animate attributeName="y1" values="54;56;54" dur="1s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="76;80;76" dur="1s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite"/>
        </line>
        <line x1="55" y1="50" x2="51" y2="70" stroke="#7ec8e3" stroke-width="2.5" stroke-linecap="round">
          <animate attributeName="y1" values="50;52;50" dur="0.7s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="70;74;70" dur="0.7s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.7s" repeatCount="indefinite"/>
        </line>
        <line x1="68" y1="52" x2="64" y2="74" stroke="#7ec8e3" stroke-width="2.5" stroke-linecap="round">
          <animate attributeName="y1" values="52;55;52" dur="0.9s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="74;78;74" dur="0.9s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.9s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`;

  const snow = () => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;3,0;0,0" dur="6s" repeatCount="indefinite"/>
        <ellipse cx="50" cy="30" rx="30" ry="17" fill="#c0ccd8"/>
        <ellipse cx="33" cy="26" rx="18" ry="14" fill="#b4c4d0"/>
        <ellipse cx="65" cy="24" rx="20" ry="12" fill="#c8d4e0"/>
      </g>
      <g fill="#d8e8f0" opacity="0.9">
        <circle cx="32" cy="56" r="3">
          <animate attributeName="cy" values="56;80;56" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="48" cy="60" r="3.5">
          <animate attributeName="cy" values="60;85;60" dur="3.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="3.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="62" cy="54" r="2.5">
          <animate attributeName="cy" values="54;78;54" dur="2.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="44" cy="52" r="2">
          <animate attributeName="cy" values="52;75;52" dur="3.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="3.2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="70" cy="58" r="2.5">
          <animate attributeName="cy" values="58;82;58" dur="3.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="3.4s" repeatCount="indefinite"/>
        </circle>
      </g>
    </svg>`;

  const thunderstorm = () => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;2,0;0,0" dur="4s" repeatCount="indefinite"/>
        <ellipse cx="50" cy="30" rx="32" ry="18" fill="#8090a0"/>
        <ellipse cx="30" cy="26" rx="20" ry="15" fill="#788898"/>
        <ellipse cx="68" cy="24" rx="22" ry="13" fill="#8898a8"/>
      </g>
      <polygon points="48,44 38,64 46,64 40,84 60,58 50,58 58,44" fill="#f4a261" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.4;0.9;0.6;0.9" dur="2s" repeatCount="indefinite"/>
      </polygon>
      <g>
        <line x1="28" y1="50" x2="25" y2="68" stroke="#7ec8e3" stroke-width="2" stroke-linecap="round" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1s" repeatCount="indefinite"/>
        </line>
        <line x1="72" y1="48" x2="69" y2="66" stroke="#7ec8e3" stroke-width="2" stroke-linecap="round" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.2s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`;

  function getIconForCode(code) {
    const c = Number(code);
    if (c === 0) return sun();
    if (c >= 1 && c <= 2) return partlyCloudy();
    if (c === 3) return cloudy();
    if (c === 45 || c === 48) return fog();
    if (c >= 51 && c <= 57) return drizzle();
    if (c >= 61 && c <= 67) return rain();
    if (c >= 71 && c <= 77) return snow();
    if (c >= 80 && c <= 82) return rain();
    if (c >= 85 && c <= 86) return snow();
    if (c === 95 || c === 96 || c === 99) return thunderstorm();
    return partlyCloudy();
  }

  function getWeatherCategory(code) {
    const c = Number(code);
    if (c === 0) return 'clear';
    if (c >= 1 && c <= 3) return 'cloudy';
    if (c === 45 || c === 48) return 'fog';
    if (c >= 51 && c <= 67) return 'rain';
    if (c >= 71 && c <= 77) return 'snow';
    if (c >= 80 && c <= 82) return 'rain';
    if (c >= 85 && c <= 86) return 'snow';
    if (c === 95 || c === 96 || c === 99) return 'thunderstorm';
    return 'clear';
  }

  function getConditionText(code) {
    const map = {
      0: 'Clear Sky',
      1: 'Mainly Clear',
      2: 'Partly Cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Rime Fog',
      51: 'Light Drizzle',
      53: 'Moderate Drizzle',
      55: 'Dense Drizzle',
      56: 'Freezing Drizzle',
      57: 'Heavy Freezing Drizzle',
      61: 'Slight Rain',
      63: 'Moderate Rain',
      65: 'Heavy Rain',
      66: 'Light Freezing Rain',
      67: 'Heavy Freezing Rain',
      71: 'Slight Snowfall',
      73: 'Moderate Snowfall',
      75: 'Heavy Snowfall',
      77: 'Snow Grains',
      80: 'Slight Rain Showers',
      81: 'Moderate Rain Showers',
      82: 'Violent Rain Showers',
      85: 'Slight Snow Showers',
      86: 'Heavy Snow Showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with Hail',
      99: 'Severe Thunderstorm',
    };
    return map[code] || 'Unknown';
  }

  return { getIconForCode, getWeatherCategory, getConditionText };
})();

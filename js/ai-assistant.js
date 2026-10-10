(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const dom = {
    open: $('ai-open-button'), panel: $('ai-panel'), backdrop: $('ai-backdrop'), close: $('ai-close-button'),
    context: $('ai-context'), messages: $('ai-messages'), prompts: $('ai-quick-prompts'),
    form: $('ai-form'), input: $('ai-input'), send: $('ai-send-button'), language: $('ai-language')
  };
  const history = [];
  const MESSAGE_LIMIT = 5;
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  let messagesRemaining = null;
  let resetAt = null;
  let quotaCheckFailed = false;
  let lastFocusedElement = null;

  function weatherContext() {
    return typeof window.getClayWeatherContext === 'function' ? window.getClayWeatherContext() : null;
  }

  function updateContextLabel() {
    const context = weatherContext();
    const locationText = context
      ? `Using live weather for ${context.location}`
      : 'Search for a location, then ask anything about its weather.';
    const limitText = messagesRemaining === null
      ? quotaCheckFailed ? 'Daily limit will be checked by the server' : 'Checking your daily limit…'
      : resetAt && messagesRemaining === 0
      ? `AI limit reached. Resets ${new Date(resetAt).toLocaleString()}.`
      : `${messagesRemaining} of ${MESSAGE_LIMIT} weather questions left`;
    dom.context.textContent = `${locationText} · ${limitText}`;
  }

  async function refreshAllowance() {
    quotaCheckFailed = false;
    updateContextLabel();
    try {
      const response = await fetch('/api/weather-assistant/limit', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error('Could not check daily limit');
      messagesRemaining = data.remaining;
      resetAt = data.resetAt || null;
    } catch {
      // Leave the count unknown; the backend remains authoritative on send.
      quotaCheckFailed = true;
    }
    updateContextLabel();
  }

  function appendFormattedText(container, text) {
    const lines = String(text).replace(/\r/g, '').split('\n');
    let list = null;
    const appendInline = (target, value) => {
      value.split(/(\*\*[^*]+\*\*)/g).forEach((piece) => {
        const bold = piece.match(/^\*\*(.+)\*\*$/);
        if (bold) {
          const strong = document.createElement('strong');
          strong.textContent = bold[1];
          target.append(strong);
        } else {
          target.append(document.createTextNode(piece));
        }
      });
    };
    lines.forEach((line) => {
      const bullet = line.match(/^\s*[-*]\s+(.+)/);
      if (bullet) {
        if (!list) { list = document.createElement('ul'); container.append(list); }
        const item = document.createElement('li');
        appendInline(item, bullet[1]);
        list.append(item);
      } else if (line.trim()) {
        list = null;
        const paragraph = document.createElement('span');
        appendInline(paragraph, line);
        container.append(paragraph, document.createElement('br'));
      } else {
        list = null;
      }
    });
  }

  function addMessage(role, text, pending = false, formatted = false) {
    const message = document.createElement('div');
    message.className = `ai-message ai-message-${role}${pending ? ' is-pending' : ''}`;
    if (role === 'assistant') {
      const avatar = document.createElement('span');
      avatar.className = 'ai-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = '☀';
      message.append(avatar);
    }
    const body = document.createElement('div');
    body.className = 'ai-message-text';
    if (formatted) appendFormattedText(body, text);
    else body.textContent = text;
    message.append(body);
    dom.messages.append(message);
    dom.messages.scrollTop = dom.messages.scrollHeight;
    return message;
  }

  function openPanel() {
    lastFocusedElement = document.activeElement;
    updateContextLabel();
    dom.backdrop.hidden = false;
    dom.panel.inert = false;
    dom.panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ai-panel-open');
    refreshAllowance();
    window.setTimeout(() => dom.input.focus(), 180);
  }

  function closePanel() {
    dom.panel.setAttribute('aria-hidden', 'true');
    dom.panel.inert = true;
    document.body.classList.remove('ai-panel-open');
    window.setTimeout(() => { dom.backdrop.hidden = true; }, 220);
    lastFocusedElement?.focus();
  }

  async function sendMessage(rawMessage) {
    const message = rawMessage.trim();
    if (!message) return;
    const context = weatherContext();
    if (!context) {
      addMessage('assistant', 'First search a city or allow location access so I can use live weather in my answer.');
      return;
    }
    if (messagesRemaining === 0) {
      updateContextLabel();
      addMessage('assistant', `You’ve reached the ${MESSAGE_LIMIT}-message Weather AI limit. Please try again after ${new Date(resetAt).toLocaleString()}.`);
      return;
    }

    addMessage('user', message);
    dom.input.value = '';
    dom.input.style.height = 'auto';
    dom.send.disabled = true;
    const pending = addMessage('assistant', 'Looking at the forecast…', true);
    const requestHistory = history.slice(-8);
    history.push({ role: 'user', text: message });

    try {
      const response = await fetch('/api/weather-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: requestHistory, weather: context, language: dom.language.value })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Weather AI is unavailable right now.');
      pending.remove();
      messagesRemaining = typeof data.remaining === 'number' ? data.remaining : Math.max(0, messagesRemaining - 1);
      resetAt = data.resetAt || resetAt;
      updateContextLabel();
      addMessage('assistant', data.reply, false, true);
      history.push({ role: 'model', text: data.reply });
    } catch (error) {
      pending.remove();
      if (error.message.includes('limit')) await refreshAllowance();
      addMessage('assistant', error.message || 'I couldn’t reach Weather AI. Please try again.');
    } finally {
      dom.send.disabled = false;
      dom.input.focus();
    }
  }

  dom.open.addEventListener('click', openPanel);
  dom.close.addEventListener('click', closePanel);
  dom.backdrop.addEventListener('click', closePanel);
  dom.form.addEventListener('submit', (event) => { event.preventDefault(); sendMessage(dom.input.value); });
  dom.prompts.addEventListener('click', (event) => {
    const button = event.target.closest('.ai-prompt');
    if (button) sendMessage(button.textContent);
  });
  dom.input.addEventListener('input', () => {
    dom.input.style.height = 'auto';
    dom.input.style.height = `${Math.min(dom.input.scrollHeight, 108)}px`;
  });
  const savedLanguage = localStorage.getItem('clay_weather_ai_language');
  if (savedLanguage && [...dom.language.options].some((option) => option.value === savedLanguage)) dom.language.value = savedLanguage;
  dom.language.addEventListener('change', () => localStorage.setItem('clay_weather_ai_language', dom.language.value));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('ai-panel-open')) closePanel();
    if (event.key === 'Enter' && !event.shiftKey && document.activeElement === dom.input) {
      event.preventDefault();
      dom.form.requestSubmit();
    }
  });
  document.addEventListener('weather:updated', updateContextLabel);
  refreshAllowance();
})();

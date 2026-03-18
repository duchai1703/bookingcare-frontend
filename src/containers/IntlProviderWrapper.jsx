// src/containers/IntlProviderWrapper.jsx
// Chuyển đổi ngôn ngữ Vi/En dựa trên Redux state — SRS IL-002
import React from 'react';
import { IntlProvider } from 'react-intl';
import { useSelector } from 'react-redux';

// Import translation files
import viMessages from '../translations/vi.json';
import enMessages from '../translations/en.json';

const messages = {
  vi: viMessages,
  en: enMessages,
};

const IntlProviderWrapper = ({ children }) => {
  // Đọc language từ Redux store
  const language = useSelector((state) => state.app.language);

  return (
    <IntlProvider
      locale={language}
      messages={messages[language]}
      defaultLocale="vi"
    >
      {children}
    </IntlProvider>
  );
};

export default IntlProviderWrapper;

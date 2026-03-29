// src/main.jsx
// Entry point — Wrap App với Redux Provider, Redux-Persist, React-Intl, Router
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { store, persistor } from './redux/store';
import IntlProviderWrapper from './containers/IntlProviderWrapper';
import App from './containers/App';
import { ToastContainer } from 'react-toastify';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Import Slick Carousel CSS
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// Import react-toastify CSS
import 'react-toastify/dist/ReactToastify.css';

// Import Global SCSS
import './styles/global.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <IntlProviderWrapper>
            <App />
            <ToastContainer
              position="top-right"
              autoClose={4000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />
          </IntlProviderWrapper>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);

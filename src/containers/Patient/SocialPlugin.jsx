// src/containers/Patient/SocialPlugin.jsx
// Facebook Social Plugin — SRS 3.14 (REQ-SI-001 Like, REQ-SI-002 Share, REQ-SI-003 Comment)
// Nhúng Facebook SDK và render Like + Share + Comment widgets
// Cần cấu hình VITE_FB_APP_ID trong .env

import React, { useEffect, useRef } from 'react';

const SocialPlugin = ({ dataHref, width = '100%', numPosts = 5 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    // 1. Khởi tạo Facebook SDK (chỉ 1 lần)
    initFacebookSDK();

    // 2. Sau khi SDK đã sẵn sàng → parse XFBML trong container
    if (window.FB) {
      window.FB.XFBML.parse(containerRef.current);
    }
  }, [dataHref]);

  // Nhúng Facebook SDK nếu chưa có
  const initFacebookSDK = () => {
    // Nếu đã load rồi → chỉ cần re-parse
    if (window.FB) {
      window.FB.XFBML.parse(containerRef.current);
      return;
    }

    // Lấy App ID từ environment
    const appId = import.meta.env.VITE_FB_APP_ID;
    if (!appId) {
      console.warn('>>> VITE_FB_APP_ID chưa được cấu hình trong .env');
      return;
    }

    // Tạo fb-root nếu chưa có
    if (!document.getElementById('fb-root')) {
      const fbRoot = document.createElement('div');
      fbRoot.id = 'fb-root';
      document.body.prepend(fbRoot);
    }

    // Callback khi SDK load xong
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      });

      // Parse lại XFBML sau khi init
      if (containerRef.current) {
        window.FB.XFBML.parse(containerRef.current);
      }
    };

    // Load SDK script (nếu chưa có)
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://connect.facebook.net/vi_VN/sdk.js`;
      document.body.appendChild(script);
    }
  };

  // URL mặc định nếu không truyền
  const href = dataHref || window.location.href;

  return (
    <div className="social-plugin" ref={containerRef}>
      {/* ===== REQ-SI-001: Like Button ===== */}
      <div className="social-plugin__like">
        <div
          className="fb-like"
          data-href={href}
          data-width=""
          data-layout="standard"
          data-action="like"
          data-size="small"
          data-share="true"
        ></div>
      </div>

      {/* ===== REQ-SI-003: Comment Plugin ===== */}
      <div className="social-plugin__comments">
        <div
          className="fb-comments"
          data-href={href}
          data-width={width}
          data-numposts={numPosts}
          data-order-by="reverse_time"
        ></div>
      </div>
    </div>
  );
};

export default SocialPlugin;

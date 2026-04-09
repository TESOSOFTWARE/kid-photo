/**
 * Analytics Utility
 * 
 * Provides a centralized way to track events across the application.
 * Currently configured to log to the console in development.
 * Easy to plug into PostHog, Plausible, GA4, etc.
 */

export const ANALYTICS_EVENTS = {
  // Navigation
  NAV_TAB_CHANGE: 'nav_tab_change',
  
  // Photo Editor
  PHOTO_UPLOAD: 'photo_upload',
  PHOTO_DOWNLOAD: 'photo_download',
  PHOTO_BULK_DOWNLOAD: 'photo_bulk_download',
  PHOTO_REMOVE: 'photo_remove',
  PHOTO_CLEAR_ALL: 'photo_clear_all',
  PHOTO_UNDO: 'photo_undo',
  PHOTO_RESET_STYLE: 'photo_reset_style',
  
  // Overlays/Styles
  STYLE_FONT_CHANGE: 'style_font_change',
  STYLE_COLOR_CHANGE: 'style_color_change',
  STYLE_TOGGLE_OVERLAY: 'style_toggle_overlay',
  STYLE_ICON_ADD: 'style_icon_add',
  STYLE_ICON_CLEAR: 'style_icon_clear',
  
  // Tag Management
  TAG_ADD: 'tag_add',
  TAG_UPDATE: 'tag_update',
  TAG_DELETE: 'tag_delete',
  TAG_TOGGLE_FORMAT: 'tag_toggle_format',
  
  // Kid Profile
  KID_ADD: 'kid_add',
  KID_REMOVE: 'kid_remove',
};

/**
 * Initializes the analytics service.
 */
export const initAnalytics = () => {
  console.log('[Analytics] Initialized');
  
  // Optional: PostHog initialization
  // if (import.meta.env.VITE_POSTHOG_KEY) {
  //   posthog.init(import.meta.env.VITE_POSTHOG_KEY, { api_host: 'https://app.posthog.com' });
  // }
};

/**
 * Tracks a custom event.
 * @param {string} eventName - The name of the event from ANALYTICS_EVENTS.
 * @param {Object} properties - Additional metadata for the event.
 */
export const trackEvent = (eventName, properties = {}) => {
  const timestamp = new Date().toISOString();
  
  // Development logging
  if (import.meta.env.DEV) {
    console.log(`[Analytics Event] ${eventName}`, {
      ...properties,
      _timestamp: timestamp,
    });
  }

  // Example: PostHog tracking
  // if (typeof posthog !== 'undefined') {
  //   posthog.capture(eventName, properties);
  // }

  // Example: Google Analytics 4
  // if (typeof window.gtag === 'function') {
  //   window.gtag('event', eventName, properties);
  // }
};

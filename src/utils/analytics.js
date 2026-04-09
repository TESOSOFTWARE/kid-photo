/**
 * Simple GA4 Event Tracking Utility
 */

export const ANALYTICS_EVENTS = {
  // Photo Actions
  UPLOAD_PHOTOS: 'upload_photos',
  REMOVE_PHOTO: 'remove_photo',
  SAVE_PHOTO: 'save_photo_single',
  SAVE_ALL_PHOTOS: 'save_photo_batch',
  
  // Tag Actions
  ADD_TAG: 'add_tag',
  DELETE_TAG: 'delete_tag',
  
  // Editor Actions
  UNDO_CLICK: 'undo_action',
  STICKER_ADD: 'sticker_add',
  STICKER_REMOVE: 'sticker_remove',
  WATERMARK_REMOVE_START: 'watermark_remove_request',
  WATERMARK_REMOVED: 'watermark_removed_success',
  
  // Navigation
  NAV_TAB_CHANGE: 'nav_tab_change'
};

/**
 * Tracks an event to Google Analytics
 * @param {string} eventName - Name of the event (from ANALYTICS_EVENTS)
 * @param {object} eventParams - Optional parameters to include
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
    
    // Optional: Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${eventName}:`, eventParams);
    }
  } else {
    if (import.meta.env.DEV) {
      console.warn(`[Analytics] gtag not found. Failed to track: ${eventName}`, eventParams);
    }
  }
};

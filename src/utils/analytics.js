/**
 * Simple GA4 Event Tracking Utility
 */

export const ANALYTICS_EVENTS = {
  // Photo Actions
  UPLOAD_PHOTOS: 'photo_upload',
  REMOVE_PHOTO: 'photo_remove',
  SAVE_PHOTO: 'photo_save_single',
  SAVE_ALL_PHOTOS: 'photo_save_batch',
  RESET_ALL: 'photo_reset_all',
  
  // Tag Actions
  ADD_TAG_START: 'tag_add_open',
  ADD_TAG_SAVE: 'tag_add_save',
  EDIT_TAG_START: 'tag_edit_open',
  EDIT_TAG_UPDATE: 'tag_edit_save',
  DELETE_TAG: 'tag_delete',
  TAG_TYPE_TOGGLE: 'tag_type_toggle',
  TAG_FREQ_TOGGLE: 'tag_freq_toggle',
  TAG_FORMAT_CHANGE: 'tag_format_select',
  
  // Editor / Style Actions
  UNDO_CLICK: 'editor_undo',
  STYLE_TOGGLE: 'editor_style_toggle', // Name, Date, Location
  FONT_CHANGE: 'editor_font_select',
  COLOR_CHANGE: 'editor_color_select',
  STICKER_ADD: 'editor_sticker_add',
  STICKER_REMOVE: 'editor_sticker_remove',
  STICKER_CLEAR: 'editor_sticker_clear_all',
  STYLE_RESET_SECTION: 'editor_reset_section',
  STYLE_APPLY_ALL: 'editor_apply_all',
  WATERMARK_REMOVE_START: 'editor_watermark_ad_start',
  WATERMARK_REMOVED: 'editor_watermark_success',
  
  // Navigation
  NAV_TAB_CHANGE: 'nav_tab_change',
  NAV_PHOTO_NEXT: 'nav_photo_next',
  NAV_PHOTO_PREV: 'nav_photo_prev',
  NAV_PHOTO_THUMB: 'nav_photo_thumb_click'
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

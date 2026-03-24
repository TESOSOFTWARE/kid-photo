import exifr from 'exifr';

/**
 * Extract metadata from photo file using exifr.
 * Supports iPhone (HEIC/JPG), Samsung, Android, and all major formats.
 */
export const extractMetadata = async (file) => {
  try {
    const data = await exifr.parse(file, {
      tiff: true,
      xmp: true,
      icc: false,
      iptc: false,
      gps: true,
      reviveValues: true,
    });

    if (!data) {
      return { dateTaken: null, location: null };
    }

    // Try multiple EXIF date fields (different phones use different keys)
    let dateTaken = null;
    const rawDate =
      data.DateTimeOriginal ||
      data.CreateDate ||
      data.DateTime ||
      data.DateTimeDigitized ||
      data.GPSDateStamp;

    if (rawDate) {
      // exifr already parses dates into JS Date objects when reviveValues: true
      dateTaken = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (isNaN(dateTaken)) {
        dateTaken = null;
      }
    }

    // GPS location
    let location = null;
    if (data.latitude != null && data.longitude != null) {
      location = {
        latitude: data.latitude,
        longitude: data.longitude,
      };
    }

    return { dateTaken, location };
  } catch (err) {
    console.warn('EXIF extraction failed, proceeding without metadata:', err.message);
    return { dateTaken: null, location: null };
  }
};

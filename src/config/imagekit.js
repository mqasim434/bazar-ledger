/**
 * Client-side ImageKit config.
 *
 * The private key must never ship in the browser. Authentication for uploads
 * will be provided by a Firebase Cloud Function (auth endpoint) in a later
 * hardening pass — not created in this module.
 */
const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || '';
const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || '';

export const imagekitConfig = {
  publicKey,
  urlEndpoint,
  /** Placeholder until the Cloud Function exists. */
  authenticationEndpoint: import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT || '',
};

export const isImageKitConfigured = Boolean(publicKey && urlEndpoint);

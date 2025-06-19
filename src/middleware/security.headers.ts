import type { MiddlewareHandler } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

// Define the secure headers options type based on the secureHeaders function parameters
type SecureHeadersOptions = Parameters<typeof secureHeaders>[0];

// Comprehensive default secure headers configuration for authentication service
const cutomSecureHeadersOptions: SecureHeadersOptions = {
  // Content Security Policy - Strict defaults for auth service
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    childSrc: ["'self'"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'https:', 'data:'],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    frameSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    manifestSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    scriptSrcAttr: ["'none'"],
    scriptSrcElem: ["'self'"],
    styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
    styleSrcAttr: ["'none'"],
    styleSrcElem: ["'self'", 'https:', "'unsafe-inline'"],
    upgradeInsecureRequests: [],
    workerSrc: ["'self'"],
  },

  // Cross-Origin policies
  crossOriginEmbedderPolicy: false, // Disabled by default for API compatibility
  crossOriginResourcePolicy: 'same-origin', // Explicit value for clarity
  crossOriginOpenerPolicy: 'same-origin', // Explicit value for clarity
  
  // Origin and referrer policies
  originAgentCluster: '?1', // Explicit value for clarity
  referrerPolicy: 'no-referrer', // Explicit value for privacy
  
  // Transport security
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  
  // Content type and download protection
  xContentTypeOptions: 'nosniff', // Explicit value for clarity
  xDnsPrefetchControl: 'off', // Explicit value for clarity
  xDownloadOptions: 'noopen', // Explicit value for clarity
  
  // Frame protection
  xFrameOptions: 'DENY',
  
  // Cross-domain and XSS protection
  xPermittedCrossDomainPolicies: 'none', // Explicit value for clarity
  xXssProtection: '0', // Modern browsers rely on CSP instead
  
  // Permissions Policy - Restrict potentially dangerous features
  permissionsPolicy: {
    fullscreen: ['self'], // fullscreen=(self)
      bluetooth: ['none'], // bluetooth=(none)
      payment: ['self'], // payment=(self "https://example.com")
      syncXhr: [], // sync-xhr=()
      camera: false, // camera=none
      microphone: true, // microphone=*
      geolocation: ['*'], // geolocation=*
      usb: ['self'], // usb=(self "https://a.example.com" "https://b.example.com")
      accelerometer: [], // accelerometer=("https://*.example.com")
      gyroscope: ['src'], // gyroscope=(src)
      magnetometer: [
    
      ], 
  },
};

const defaultSecureHeadersOptions: SecureHeadersOptions = {}

// Export the default configured middleware
export const securityHeaders = (options?: SecureHeadersOptions): MiddlewareHandler => {
  return secureHeaders({ ...defaultSecureHeadersOptions, ...options });
};

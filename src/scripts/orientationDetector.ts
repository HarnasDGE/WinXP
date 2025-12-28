/**
 * Orientation Detector
 * Detects device type and screen orientation
 */

export type DeviceType = 'mobile' | 'desktop';
export type OrientationType = 'portrait' | 'landscape';

export interface OrientationState {
  deviceType: DeviceType;
  orientation: OrientationType;
  shouldShowWarning: boolean;
}

/**
 * Checks if the device is mobile based on screen width and user agent
 */
export function isMobileDevice(): boolean {
  // Check screen width
  const isMobileWidth = window.innerWidth <= 768;

  // Check user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

  return isMobileWidth || isMobileUA;
}

/**
 * Gets current screen orientation
 */
export function getOrientation(): OrientationType {
  if (window.innerHeight > window.innerWidth) {
    return 'portrait';
  }
  return 'landscape';
}

/**
 * Gets complete orientation state
 */
export function getOrientationState(): OrientationState {
  const deviceType: DeviceType = isMobileDevice() ? 'mobile' : 'desktop';
  const orientation = getOrientation();
  const shouldShowWarning = deviceType === 'mobile' && orientation === 'portrait';

  return {
    deviceType,
    orientation,
    shouldShowWarning
  };
}

/**
 * Sets up orientation change listener
 */
export function setupOrientationListener(callback: (state: OrientationState) => void): () => void {
  const handleOrientationChange = () => {
    callback(getOrientationState());
  };

  // Listen for orientation changes
  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleOrientationChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', handleOrientationChange);
  };
}

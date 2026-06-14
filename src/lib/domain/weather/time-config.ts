/**
 * Customizable configurations for day/night cycle speed, durations, and weather parameters.
 */
export const TIME_WEATHER_CONFIG = {
  /** Total duration of a full 24h game cycle in real-world seconds (default: 1200 / 20 mins) */
  dayDurationSeconds: 1200,

  /** Speed multiplier for time progression. 1.0 is default, 2.0 is double speed, 0 is paused. */
  timeSpeedMultiplier: 1.0,

  /** Fraction of the day [0..1] when daytime begins (dawn starts). Default: 0.18 */
  dayStartFraction: 0.18,

  /** Fraction of the day [0..1] when nighttime begins (dusk starts). Default: 0.75 */
  nightStartFraction: 0.75,

  /** Minimum and maximum duration in seconds for rain events */
  rainDurationMinSec: 90,
  rainDurationMaxSec: 180,

  /** Minimum and maximum cooldown in seconds between rain events */
  rainCooldownMinSec: 180,
  rainCooldownMaxSec: 420,

  /** Maximum alpha opacity of the night overlay (higher = darker nights) */
  maxNightDarkness: 0.72,

  /** Ambient light colors for the day/night transitions */
  colors: {
    dawn: 0x1a2130, // cool morning blue
    day: 0xffffff,  // neutral white daylight
    dusk: 0x2c1620, // warm sunset orange/purple
    night: 0x070714, // deep dark blue-indigo
  },

  /** Rain particles maximum density on screen */
  rainMaxParticles: 150,

  /** Wind strength (horizontal speed of rain) */
  rainWindStrength: -100,

  /** Rain fall speed (vertical speed of rain) */
  rainFallSpeed: 800,
};

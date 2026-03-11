class WindManager {
  constructor() {
    this.windAngle = null; // p5-compatible angle in radians
    this.windSpeed = null; // km/h
    this.meteoDegrees = null; // raw meteorological degrees
    this.variationRange = null; // radians
    this.lastFetch = 0;
    this.fetchInterval = 5 * 60 * 1000; // 5 minutes
    this.error = null;
  }

  async fetchWind() {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=40.632&longitude=-73.808&current=wind_speed_10m,wind_direction_10m&timezone=auto";
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const speed = data.current.wind_speed_10m;
      const direction = data.current.wind_direction_10m;

      this.windSpeed = speed;
      this.meteoDegrees = direction;
      this.windAngle = this.meteoToP5Angle(direction);
      this.variationRange = this.speedToVariation(speed);
      this.lastFetch = Date.now();
      this.error = null;

      console.log(
        `Wind fetched: ${speed} km/h from ${direction}° → p5 angle ${this.windAngle.toFixed(2)} rad, variation ±${this.variationRange.toFixed(2)} rad`
      );
    } catch (err) {
      this.error = err.message;
      console.warn("Wind fetch failed:", err.message);
    }
  }

  // Convert meteorological degrees (clockwise from N, "from" direction)
  // to p5.js radians (direction wind blows TO)
  meteoToP5Angle(degrees) {
    return ((degrees + 90) * Math.PI) / 180;
  }

  // Map wind speed to noise variation range
  // Calm → wide variation (chaotic), Strong → narrow (aligned)
  speedToVariation(speedKmh) {
    // 0-5 km/h → ±90° (PI/2), 40+ km/h → ±45° (PI/4)
    let variation = map(speedKmh, 0, 40, PI / 2, PI / 4);
    return constrain(variation, PI / 4, PI / 2);
  }

  shouldRefresh() {
    return Date.now() - this.lastFetch > this.fetchInterval;
  }

  hasData() {
    return this.windAngle !== null;
  }

  directionLabel() {
    if (this.meteoDegrees === null) return "N/A";
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(this.meteoDegrees / 45) % 8;
    return dirs[index];
  }
}

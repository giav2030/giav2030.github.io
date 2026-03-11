// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// The "Vehicle" class

class Vehicle {
  constructor(x, y, ms, mf, r, g, b) {
    this.position = createVector(x, y);
    this.prevPosition = this.position.copy();
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(0, 0);
    this.r = 4;
    this.maxspeed = ms;
    this.maxforce = mf;
    this.red = r;
    this.green = g;
    this.blue = b;
    this.strokeW = random(3, 7);
    this.alpha = random(60, 140);
    this.bristles = floor(random(3, 16));
    this.bristleSpread = this.strokeW * 0.6;
  }

  run(vehicles) {
    this.separate(vehicles);
    this.update();
    this.borders();
  }

  // Separation: steer away from nearby vehicles to prevent clumping
  separate(vehicles) {
    let desiredSeparation = this.r * 3;
    let steer = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < desiredSeparation) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.normalize();
        diff.div(d); // Weight by distance — closer = stronger repulsion
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) {
      steer.div(count);
      steer.setMag(this.maxspeed);
      steer.sub(this.velocity);
      steer.limit(this.maxforce);
      this.applyForce(steer);
    }
  }

  // Implementing Reynolds' flow field following algorithm
  // http://www.red3d.com/cwr/steer/FlowFollow.html
  follow(flow) {
    // What is the vector at that spot in the flow field?
    let desired = flow.lookup(this.position);
    // Scale it up by maxspeed
    desired.mult(this.maxspeed);
    // Steering is desired minus velocity
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxforce); // Limit to maximum steering force
    this.applyForce(steer);
  }

  applyForce(force) {
    // We could add mass here if we want A = F / M
    this.acceleration.add(force);
  }

  // Method to update location
  update() {
    this.prevPosition = this.position.copy();
    // Update velocity
    this.velocity.add(this.acceleration);
    // Limit speed
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    // Reset acceleration to 0 each cycle
    this.acceleration.mult(0);
  }

  // Wraparound — reset prevPosition on wrap to avoid lines across screen
  borders() {
    let wrapped = false;
    if (this.position.x < -this.r) { this.position.x = width + this.r; wrapped = true; }
    if (this.position.y < -this.r) { this.position.y = height + this.r; wrapped = true; }
    if (this.position.x > width + this.r) { this.position.x = -this.r; wrapped = true; }
    if (this.position.y > height + this.r) { this.position.y = -this.r; wrapped = true; }
    if (wrapped) this.prevPosition = this.position.copy();
  }

  drawTrail(pg) {
    pg.strokeCap(ROUND);
    // Direction perpendicular to the stroke for bristle spread
    let dx = this.position.x - this.prevPosition.x;
    let dy = this.position.y - this.prevPosition.y;
    let len = sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;
    // Perpendicular unit vector
    let px = -dy / len;
    let py = dx / len;
    
    for (let i = 0; i < this.bristles; i++) {
      let offset = map(i, 0, this.bristles - 1, -this.bristleSpread, this.bristleSpread);
      let jitter = random(-0.5, 0.5);
      let ox = px * (offset + jitter);
      let oy = py * (offset + jitter);
      let a = this.alpha * random(0.4, 1.0);
      let w = this.strokeW / this.bristles * random(0.8, 1.5);
      pg.stroke(this.red, this.green, this.blue, a);
      pg.strokeWeight(w);
      pg.line(
        this.prevPosition.x + ox, this.prevPosition.y + oy,
        this.position.x + ox + random(-0.3, 0.3), this.position.y + oy + random(-0.3, 0.3)
      );
    }
  }
}
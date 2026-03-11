// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// The "Vehicle" class — BACKUP of triangle-based version

class Vehicle {
  constructor(x, y, ms, mf, r, g, b) {
    this.position = createVector(x, y);
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(0, 0);
    this.r = 4;
    this.maxspeed = ms;
    this.maxforce = mf;
    this.red = r;
    this.green = g;
    this.blue = b;
    this.angle = random(TWO_PI);
    this.oscSpeed = random(0.05, 0.10);
  }

  run(vehicles) {
    this.separate(vehicles);
    this.update();
    this.borders();
    this.show();
  }

  // Separation: steer away from nearby vehicles to prevent clumping
  separate(vehicles) {
    let desiredSeparation = this.r * 8;
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
    // Update velocity
    this.velocity.add(this.acceleration);
    // Limit speed
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    // Reset acceleration to 0 each cycle
    this.acceleration.mult(0);
    // Advance oscillation phase
    this.angle += this.oscSpeed;
  }

  // Wraparound
  borders() {
    if (this.position.x < -this.r) this.position.x = width + this.r;
    if (this.position.y < -this.r) this.position.y = height + this.r;
    if (this.position.x > width + this.r) this.position.x = -this.r;
    if (this.position.y > height + this.r) this.position.y = -this.r;
  }

  show() {
    // Draw a triangle rotated in the direction of velocity
    let theta = this.velocity.heading();
    // Oscillate size between 0.5x and 1.5x
    let scale = map(sin(this.angle), -1, 1, 0.5, 2);
    let sz = this.r * scale;

    fill(this.red, this.green, this.blue);
    noStroke();
    push();
    translate(this.position.x, this.position.y);
    rotate(theta);
    beginShape();
    vertex(sz * 2, 0);
    vertex(-sz * 2, -sz);
    vertex(-sz * 2, sz);
    endShape(CLOSE);
    pop();
  }
}

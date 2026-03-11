// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Flow Field Following with Live Wind Data
// Via Reynolds: http://www.red3d.com/cwr/steer/FlowFollow.html

//inspired by Taylor Hobbs Flow Fields 
// via: https://www.tylerxhobbs.com/words/flow-fields

// Using this variable to decide whether to draw all the stuff
let debug = false;

// Flowfield object
let flowfield;
// An ArrayList of vehicles
let vehicles = [];
// Wind manager
let wind;

let chords = [];
let colors = [];
let trailBuffer;

function getColors(){
for(let i = 0; i < 7; i++){
  let color = [random(255), random(255), random(255)];
  colors.push(color);
}
console.log(colors);  
return colors;
}
function setup() {
  
  let title = createElement('h1', 'Music of the Wind');
  title.class('title');
  let instructions = createP('Click the mouse to generate a new flow field and start the sound.<br>Press space to toggle the flow field trace lines.');
  instructions.class('instructions');

  createCanvas(640, 240);
  trailBuffer = createGraphics(640, 240);
  // Paper texture: dibujar bitmap de pixeles para dibujar la textura pixel por pixel
  trailBuffer.loadPixels();
  for (let x = 0; x < trailBuffer.width; x++) {
    for (let y = 0; y < trailBuffer.height; y++) {
      let grain = noise(x * 0.5, y * 0.5) * 30 + noise(x * 3, y * 3) * 15;
      let v = 245 - grain;
      let idx = (x + y * trailBuffer.width) * 4;
      trailBuffer.pixels[idx]     = v;
      trailBuffer.pixels[idx + 1] = v;
      trailBuffer.pixels[idx + 2] = v;
      trailBuffer.pixels[idx + 3] = 255;
    }
  }
  trailBuffer.updatePixels();

  //get colors
  getColors();
  // Make a new flow field with "resolution" of 20
  flowfield = new FlowField(20);

  // Make a whole bunch of vehicles with random maxspeed and maxforce values
  
  for (let i = 0; i < 150; i++) {
    let c = random(colors);
    vehicles.push(
      new Vehicle(random(width), random(height), random(0.5, 2), random(0.05, 0.2), c[0], c[1], c[2])
    );
  }

  // Create wind manager and fetch initial data
  wind = new WindManager();
  wind.fetchWind().then(() => {
    if (wind.hasData()) {
      flowfield.init(wind.windAngle, wind.variationRange);
    }
  });

  //create chord particles
  for(let i = 0; i < 7; i++){
    let c = colors[i];  
    
    chords.push(new Chord(random(width), random(height), i + 1, c[0], c[1], c[2]));
    }
}

function draw() {
  // Auto-refresh wind data every 5 minutes
  if (wind && wind.shouldRefresh()) {
    wind.fetchWind().then(() => {
      if (wind.hasData()) {
        flowfield.init(wind.windAngle, wind.variationRange);
      }
    });
  }

  // Update vehicles and draw trails onto the buffer
  for (let i = 0; i < vehicles.length; i++) {
    vehicles[i].follow(flowfield);
    vehicles[i].separate(vehicles);
    vehicles[i].update();
    vehicles[i].borders();
    vehicles[i].drawTrail(trailBuffer); // dibuja en este bitmap
  }

  for(let c of chords){
    c.interactWithVehicles(vehicles);
  }

  // Composite: trail buffer first, then chord particles on top
  background(255);
  image(trailBuffer, 0, 0);

  // Display the flowfield in "debug" mode
  if (debug) flowfield.show();

  for(let c of chords){
    c.separate(chords);
    c.update();
    c.borders();
    c.show();
  }

}

function keyPressed() {
  if (key == " ") {
    debug = !debug;
  }
}

// Make a new flowfield — new noise pattern but preserve wind bias
function mousePressed() {
  Tone.start();
  Tone.Transport.start();
  if (wind && wind.hasData()) {
    flowfield.init(wind.windAngle, wind.variationRange);
  } else {
    flowfield.init();
  }
}

function drawWindHUD() {
  push();
  // Semi-transparent background box in top-right
  let boxW = 160;
  let boxH = 105;
  let boxX = width - boxW - 10;
  let boxY = 10;

  fill(0, 0, 0, 160);
  noStroke();
  rect(boxX, boxY, boxW, boxH, 6);

  fill(255);
  noStroke();
  textSize(11);
  textAlign(LEFT, TOP);
  let tx = boxX + 10;
  let ty = boxY + 8;

  if (wind && wind.hasData()) {
    text("Wind: " + nf(wind.windSpeed, 1, 1) + " km/h", tx, ty);
    text("Direction: " + wind.directionLabel(), tx, ty + 16);
    text("Variation: \u00B1" + nf(degrees(wind.variationRange), 1, 1) + "\u00B0", tx, ty + 32);

    // Draw wind direction arrow
    let arrowCx = boxX + boxW - 28;
    let arrowCy = boxY + boxH - 28;
    let arrowLen = 14;
    push();
    translate(arrowCx, arrowCy);
    rotate(wind.windAngle);
    stroke(255);
    strokeWeight(2);
    line(-arrowLen, 0, arrowLen, 0);
    // Arrowhead
    fill(255);
    noStroke();
    triangle(arrowLen, 0, arrowLen - 5, -3, arrowLen - 5, 3);
    pop();
  } else if (wind && wind.error) {
    text("Wind: error", tx, ty);
    text(wind.error, tx, ty + 16);
    text("Using Perlin noise", tx, ty + 32);
  } else {
    text("Wind: loading...", tx, ty);
  }
  pop();
}

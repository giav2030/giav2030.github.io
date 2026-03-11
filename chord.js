// 7 diatonic chords in C major — jazz voicings with inversions & extensions
const DIATONIC_CHORDS = [
  ["E3", "B3", "D4", "G4", "A4"],  // Cmaj13 — rootless, spread
  ["F3", "C4", "E4", "A4"],        // Dm9 — rootless, open (3-7-9-5)
  ["B3", "D4", "G4", "A4"],        // Em11 — quartal, modern
  ["A3", "E4", "G4", "B4"],        // Fmaj9#11 — lydian, dreamy
  ["F3", "A3", "B3", "E4"],        // G13 — rootless (7-9-3-13)
  ["G3", "C4", "E4", "B4"],        // Am9 — open voicing
  ["F3", "A3", "D4", "E4"],        // Bø(add11) — dark, spread
];

const filter = new Tone.Filter({ frequency: 1000, type: "lowpass", rolloff: -24 });
const delay = new Tone.FeedbackDelay({delayTime: "8n", feedback: 0.3, wet: 0.1});
const delayFilter = new Tone.Filter({frequency: 800, type: "lowpass", rolloff: -12});
const reverb = new Tone.Reverb({ decay: 3, wet: 0.7 }).toDestination();
const limiter = new Tone.Limiter(-12).connect(reverb);
filter.connect(delay);
delay.connect(delayFilter);
delayFilter.connect(limiter);
const synth = new Tone.PolySynth(Tone.Synth, {
  maxPolyphony: 10,
  options: {
    oscillator: { type: "fatsine", spread: 12, count: 3 },
    envelope: {
      attack: 0.3,
      decay: 1,
      sustain: 0.10,
      release: 2.5,
    },
    volume: -26,
  },
}).connect(filter);

// Rhythm grid: each chord gets a subdivision and duration
const RHYTHM_GRID = [
  { quantize: "2n",  duration: "2n"  },  // Cmaj13 — half notes, spacious
  { quantize: "4n",  duration: "4n"  },  // Dm9 — quarter notes
  { quantize: "8n",  duration: "8n"  },  // Em11 — eighth notes, quick
  { quantize: "2n",  duration: "4n." },  // Fmaj9#11 — half note grid, dotted quarter dur
  { quantize: "4n",  duration: "8n"  },  // G13 — quarter grid, short
  { quantize: "8n",  duration: "4n"  },  // Am9 — eighth grid, longer ring
  { quantize: "4n",  duration: "2n"  },  // Bø — quarter grid, long sustain
];

Tone.Transport.bpm.value = 72;
let chordLock = false;

class Chord {
    constructor(x, y, ton, red, green, blue){
    this.position = createVector(x, y);
    this.prevPosition = this.position.copy();
    this.velocity = createVector(0,0);
    this.acceleration  = createVector(0,0);
    this.r = 12;
    this.red = red;
    this.green = green;
    this.blue = blue;

    this.maxspeed = 2;
    this.maxforce = 0.3;

    this.notes = DIATONIC_CHORDS[ton - 1];
    this.quantize = RHYTHM_GRID[ton - 1].quantize;
    this.duration = RHYTHM_GRID[ton - 1].duration;
    this.sizeMultiplier = 1.0;
    this.sizeTarget = 1.0;
    this.sizeEase = 0.08;

    }

    applyForce(force){
        this.acceleration.add(force);
    }

    update(){
        this.prevPosition = this.position.copy();
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxspeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);

        // Ease size back to normal
        this.sizeMultiplier = lerp(this.sizeMultiplier, this.sizeTarget, this.sizeEase);
        if (this.sizeTarget > 1.0 && this.sizeMultiplier > this.sizeTarget * 0.95) {
            this.sizeTarget = 1.0;
        }
    }

    //Interaction with vehicles
    interactWithVehicles(vehicles){
        // Skip if chord is near or past the canvas edge
        // (splat radius extends this.r, so center must be inset to be visible)
        if (this.position.x < this.r || this.position.x > width - this.r ||
            this.position.y < this.r || this.position.y > height - this.r) return;

        for(let v of vehicles){
            // Skip vehicles outside the canvas
            if (v.position.x < 0 || v.position.x > width ||
                v.position.y < 0 || v.position.y > height) continue;
            let d = p5.Vector.dist(this.position, v.position);
            let sameColor = (this.red === v.red && this.green === v.green && this.blue === v.blue);

            if (sameColor && d < this.r * 2){
                // attract vehicle toward chord
                let desired = p5.Vector.sub(this.position, v.position);
                desired.setMag(v.maxspeed);
                let steer = p5.Vector.sub(desired, v.velocity);
                steer.limit(v.maxforce);
                v.applyForce(steer);

                // repel chord away from vehicle
                let diff = p5.Vector.sub(this.position, v.position);
                diff.setMag(this.maxspeed);
                let chordSteer = p5.Vector.sub(diff, this.velocity);
                chordSteer.limit(this.maxforce);
                this.applyForce(chordSteer);

                // trigger sound (grow animation happens inside if not locked)
                this.playChord();
            } 
            else if (!sameColor && d < this.r * 3){
                //repel
                let diff = p5.Vector.sub(v.position, this.position);
                diff.setMag(v.maxspeed);
                let steer = p5.Vector.sub(diff, v.velocity);
                steer.limit(v.maxforce);
                v.applyForce(steer);
            }
        }
    }
    //separation
    separate(particles){
        let desiredSeparation = this.r * 2;
        let sum = createVector();
        let count = 0;

        for(let other of particles){
            const d = p5.Vector.dist(this.position, other.position);
            if(this != other && d < desiredSeparation){
                let diff = p5.Vector.sub(this.position, other.position);
                diff.setMag(1/d);
                sum.add(diff);
                count++;
            }
        }

        if(count > 0){
            sum.setMag(this.maxspeed);
            let steer = p5.Vector.sub(sum, this.velocity);
            steer.limit(this.maxforce);
            this.applyForce(steer);
        }
    }

    playChord(){
        if (chordLock) return;
        chordLock = true;

        const notes = this.notes;
        const dur = this.duration;

        Tone.Transport.scheduleOnce((time) => {
            this.sizeTarget = 2.0;
            synth.releaseAll(time);
            synth.triggerAttackRelease(notes, dur, time + 0.15);
            chordLock = false;
        }, Tone.Transport.nextSubdivision(this.quantize));
    }

    show(){
        push();
        translate(this.position.x, this.position.y);
        scale(this.sizeMultiplier);
        noStroke();

        // Core splat — overlapping irregular ellipses
        for (let i = 0; i < 12; i++) {
            let angle = noise(this.position.x * 0.01, this.position.y * 0.01, i) * TWO_PI;
            let dist = noise(i * 0.3, this.position.x * 0.02) * this.r * 0.4;
            let sz = this.r * random(0.5, 1.2);
            let stretch = random(0.6, 1.4);
            fill(this.red, this.green, this.blue, random(100, 200));
            push();
            rotate(angle);
            ellipse(dist, 0, sz * stretch, sz / stretch);
            pop();
        }

        // Outer spatter — small droplets flung outward
        for (let i = 0; i < 20; i++) {
            let angle = random(TWO_PI);
            let dist = this.r * 0.5 + random(this.r * 0.8);
            let sz = random(1, 3.5);
            fill(this.red, this.green, this.blue, random(60, 160));
            circle(cos(angle) * dist, sin(angle) * dist, sz);
        }

        pop();
    }

    borders(){
        if(this.position.x < -this.r) this.position.x = width + this.r;
        if(this.position.y < -this.r) this.position.y = height + this.r;
        if(this.position.x > width + this.r) this.position.x = -this.r;
        if(this.position.y > height + this.r) this.position.y = -this.r;
    }
}
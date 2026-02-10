const canvasBackground = document.getElementById("backgroundCanvas");
const ctxBackground = canvasBackground.getContext("2d");

const canvasStars = document.getElementById("starsCanvas");
const ctxStars = canvasStars.getContext("2d");

// Default options
const defaultOptions = {
  numberOfStars: 300,
  maxDistance: 70,
  starSize: { min: 2, max: 7 },
  speedFactor: 1,
  mouseRadius: 200,
  starColor: "#fff",
  connectionColor: "rgba(255, 255, 255, ${opacity})",
  canvasBackgroundColor: "#000",
  backgroundImageURL: null, // Option to set a background image
  overlayColor: "rgba(0, 0, 0, 0.5)", // Color to overlay on top of the background image
  lineThickness: 1,
  starShapes: ["circle", "star"],
  randomStarSpeeds: true,
  rotationSpeed: { min: 0.001, max: 0.003 },
  connectionsWhenNoMouse: false,
  percentStarsConnecting: 30, // percentage of stars that can connect when mouse is not on canvasStars
  connectionLinesDashed: false, // option to make connection lines dashed
  dashedLinesConfig: [5, 15], // configuration for dashed lines
  canvasGradient: null, // gradient for canvasStars background
  starDensity: "medium", // Options: 'low', 'medium', 'high', 'ultra'
  interactive: false, // If true the user can add stars by clicking on the canvasStars
  parallaxEffect: true,
  parallaxStrength: 1, // the higher, the slower the motion
  idleRestartTime: 1000
};

const userOptions = {};

// Star densities corresponding to 'low', 'medium', 'high', and 'ultra'
const starDensities = {
  low: 0.00005,
  medium: 0.0001,
  high: 0.0002,
  ultra: 0.0004
};

// Merge user options with default options
const options = { ...defaultOptions, ...userOptions };

// Size of a cell in the hashmap
const CELL_SIZE = options.maxDistance;
// The hashmap
let cells = {};

window.addEventListener("resize", function () {
  stars.length = 0; // Clear the existing stars
  cells = {}; // Clear the existing cells
  resizeCanvas();
  createStars(); // Create new stars according to the new screen size
});

const stars = [];
const mouse = { x: null, y: null };
const backgroundParallax = { strength: 0.03, maxOffset: 20 };
const specialStars = [];
let activeSpecialStar = null;
const specialStarConfig = {
  count: 3,
  size: 90,
  pulseSpeed: 0.002,
  pulseRange: 0.25,
  moveSpeed: 0.08,
  margin: 80,
  clickedScale: 1.6,
  hoverRadius: 220,
  hoverOffset: 10
};
const specialStarMessages = {};
const overlay = document.getElementById("messageOverlay");
const overlayText = document.getElementById("messageText");

const specialStarImage = new Image();
specialStarImage.src = "star.png";

// Change in the mousemove event listener
let animationIdleTimeout = null;

window.addEventListener("mousemove", function (event) {
  mouse.x = event.x;
  mouse.y = event.y;
  updateBackgroundParallax();

  // Clear any previous timeout
  clearTimeout(animationIdleTimeout);

  // Set a new timeout
  animationIdleTimeout = setTimeout(() => {
    mouse.x = null;
    mouse.y = null;
    updateBackgroundParallax();
  }, options.idleRestartTime);
});

function resizeCanvas() {
  canvasBackground.width = window.innerWidth;
  canvasBackground.height = window.innerHeight;
  canvasStars.width = window.innerWidth;
  canvasStars.height = window.innerHeight;

  // Drawing the background
  if (options.canvasGradient) {
    const gradient = ctxBackground.createLinearGradient(
      0,
      0,
      canvasBackground.width,
      canvasBackground.height
    );
    options.canvasGradient.forEach((color, index) => {
      gradient.addColorStop(index / (options.canvasGradient.length - 1), color);
    });
    ctxBackground.fillStyle = gradient;
    ctxBackground.fillRect(
      0,
      0,
      canvasBackground.width,
      canvasBackground.height
    );
  } else if (options.backgroundImageURL) {
    const img = new Image();
    img.onload = function () {
      ctxBackground.drawImage(
        img,
        0,
        0,
        canvasBackground.width,
        canvasBackground.height
      );
      ctxBackground.fillStyle = options.overlayColor;
      ctxBackground.fillRect(
        0,
        0,
        canvasBackground.width,
        canvasBackground.height
      );
    };
    img.src = options.backgroundImageURL;
  } else {
    ctxBackground.fillStyle = options.canvasBackgroundColor;
    ctxStars.fillRect(0, 0, canvasBackground.width, canvasBackground.height);
  }
}

function createSpecialStars() {
  specialStars.length = 0;
  const columns = Math.min(specialStarConfig.count, 3);
  const rows = Math.ceil(specialStarConfig.count / columns);
  const usableWidth = canvasStars.width - specialStarConfig.margin * 2;
  const usableHeight = canvasStars.height - specialStarConfig.margin * 2;
  for (let i = 0; i < specialStarConfig.count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const cellWidth = usableWidth / Math.max(1, columns);
    const cellHeight = usableHeight / Math.max(1, rows);
    const x =
      specialStarConfig.margin +
      cellWidth * col +
      Math.random() * cellWidth;
    const y =
      specialStarConfig.margin +
      cellHeight * row +
      Math.random() * cellHeight;
    specialStars.push({
      id: i + 1,
      x,
      y,
      baseX: x,
      baseY: y,
      targetX: x,
      targetY: y,
      baseSize: specialStarConfig.size,
      currentScale: 1,
      pulsePhase: Math.random() * Math.PI * 2,
      clicked: false,
      message: ""
    });
  }
}

function Star(x, y) {
  this.x = x;
  this.y = y;
  this.size =
    Math.random() * (options.starSize.max - options.starSize.min) +
    options.starSize.min;
  this.shape =
    options.starShapes[Math.floor(Math.random() * options.starShapes.length)];
  this.speedX =
    (Math.random() - 0.5) *
    (options.randomStarSpeeds ? options.speedFactor : 1);
  this.speedY =
    (Math.random() - 0.5) *
    (options.randomStarSpeeds ? options.speedFactor : 1);
  this.rotation = 0;
  this.rotationSpeed =
    Math.random() * (options.rotationSpeed.max - options.rotationSpeed.min) +
    options.rotationSpeed.min;
  if (options.percentStarsConnecting === 100) {
    this.connects = true;
  } else {
    this.connects =
      options.connectionsWhenNoMouse &&
      Math.random() < options.percentStarsConnecting / 100;
  }
  this.depth = Math.random();
  this.originalX = x;
  this.originalY = y;
  this.size *= this.depth; // Size varies based on depth
}

function updateStarPositionForParallax() {
  if (!options.parallaxEffect || !mouse.x || !mouse.y) return;

  stars.forEach((star) => {
    const dx = (canvasStars.width / 2 - mouse.x) / options.parallaxStrength;
    const dy = (canvasStars.height / 2 - mouse.y) / options.parallaxStrength;
    star.x = star.originalX + dx * (1 - star.depth);
    star.y = star.originalY + dy * (1 - star.depth);
  });
}

function updateBackgroundParallax() {
  if (mouse.x === null || mouse.y === null) {
    document.body.style.setProperty("--bg-x", "0px");
    document.body.style.setProperty("--bg-y", "0px");
    return;
  }

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const dx = mouse.x - centerX;
  const dy = mouse.y - centerY;
  const offsetX = Math.max(
    -backgroundParallax.maxOffset,
    Math.min(backgroundParallax.maxOffset, -dx * backgroundParallax.strength)
  );
  const offsetY = Math.max(
    -backgroundParallax.maxOffset,
    Math.min(backgroundParallax.maxOffset, -dy * backgroundParallax.strength)
  );

  document.body.style.setProperty("--bg-x", `${offsetX}px`);
  document.body.style.setProperty("--bg-y", `${offsetY}px`);
}

function updateSpecialStars() {
  specialStars.forEach((star) => {
    if (star.clicked) {
      const dx = star.targetX - star.x;
      const dy = star.targetY - star.y;
      star.x += dx * specialStarConfig.moveSpeed;
      star.y += dy * specialStarConfig.moveSpeed;
      star.currentScale +=
        (specialStarConfig.clickedScale - star.currentScale) * 0.08;
      return;
    }

    let offsetX = 0;
    let offsetY = 0;
    if (mouse.x !== null && mouse.y !== null) {
      const dx = star.baseX - mouse.x;
      const dy = star.baseY - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < specialStarConfig.hoverRadius) {
        const strength =
          (1 - distance / specialStarConfig.hoverRadius) *
          specialStarConfig.hoverOffset;
        const norm = distance === 0 ? 1 : distance;
        offsetX = (dx / norm) * strength;
        offsetY = (dy / norm) * strength;
      }
    }

    const targetX = star.baseX + offsetX;
    const targetY = star.baseY + offsetY;
    star.x += (targetX - star.x) * 0.08;
    star.y += (targetY - star.y) * 0.08;
    star.currentScale += (1 - star.currentScale) * 0.08;
  });
}

function drawSpecialStars() {
  if (!specialStarImage.complete) return;
  specialStars.forEach((star) => {
    const pulse =
      1 +
      Math.sin(performance.now() * specialStarConfig.pulseSpeed + star.pulsePhase) *
        specialStarConfig.pulseRange;
    const size = star.baseSize * pulse * star.currentScale;
    const half = size / 2;
    ctxStars.save();
    ctxStars.globalAlpha = 0.9;
    ctxStars.drawImage(specialStarImage, star.x - half, star.y - half, size, size);
    ctxStars.restore();
  });
}

activeSpecialStar = star;
function showMessage(message) {
  if (!overlay || !overlayText) return;
  overlayText.textContent = message;
  overlay.classList.add("visible");
  overlay.setAttribute("aria-hidden", "false");
}

function hideMessage() {
  if (!overlay) return;
  overlay.classList.remove("visible");
  overlay.setAttribute("aria-hidden", "true");
  if (activeSpecialStar) {
    activeSpecialStar.clicked = false;
    activeSpecialStar.targetX = activeSpecialStar.baseX;
    activeSpecialStar.targetY = activeSpecialStar.baseY;
    activeSpecialStar.currentScale = 1;
    activeSpecialStar = null;
  }
}

Star.prototype.draw = function () {
  ctxStars.beginPath();
  ctxStars.fillStyle = options.starColor;
  switch (this.shape) {
    case "circle":
      ctxStars.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      break;
    case "star":
      ctxStars.save();
      ctxStars.translate(this.x, this.y);
      ctxStars.rotate(this.rotation);
      ctxStars.beginPath();
      // Five-point star shape
      for (let i = 0; i < 5; i++) {
        ctxStars.lineTo(0, -this.size / 2);
        ctxStars.translate(0, -this.size / 2);
        ctxStars.rotate((Math.PI * 2) / 10);
        ctxStars.lineTo(0, -this.size / 2);
        ctxStars.translate(0, -this.size / 2);
        ctxStars.rotate(-((Math.PI * 6) / 10));
      }
      ctxStars.lineTo(0, -this.size / 2);
      ctxStars.restore();
      break;
    // More shapes can be added here
  }
  ctxStars.closePath();
  ctxStars.fill();
};

let backgroundImage = null;
if (options.backgroundImageURL) {
  backgroundImage = new Image();
  backgroundImage.src = options.backgroundImageURL;
}

// Modified animateStars function
function animateStars() {
  updateStarPositionForParallax();
  ctxStars.clearRect(0, 0, canvasStars.width, canvasStars.height);

  // Clear the cell hash at the start of each animation frame
  cells = {};

  stars.forEach((star) => {
    star.x += star.speedX;
    star.y += star.speedY;

    if (star.shape === "star") star.rotation += star.rotationSpeed;
    if (star.x > canvasStars.width || star.x < 0) {
      star.speedX = -star.speedX;
    }
    if (star.y > canvasStars.height || star.y < 0) {
      star.speedY = -star.speedY;
    }
    star.draw();

    // Recalculate cell position after star movement
    let cellX = Math.floor(star.x / CELL_SIZE);
    let cellY = Math.floor(star.y / CELL_SIZE);
    if (!cells[cellX]) {
      cells[cellX] = {};
    }
    if (!cells[cellX][cellY]) {
      cells[cellX][cellY] = [];
    }
    cells[cellX][cellY].push(star);

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        let neighbourCellX = cellX + i;
        let neighbourCellY = cellY + j;
        if (cells[neighbourCellX] && cells[neighbourCellX][neighbourCellY]) {
          cells[neighbourCellX][neighbourCellY].forEach((otherStar) => {
            let dx = star.x - otherStar.x;
            let dy = star.y - otherStar.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let mouseDx = star.x - mouse.x;
            let mouseDy = star.y - mouse.y;
            let mouseDistance = Math.sqrt(
              mouseDx * mouseDx + mouseDy * mouseDy
            );
            if (
              distance < options.maxDistance &&
              (mouseDistance < options.mouseRadius ||
                (star.connects && otherStar.connects))
            ) {
              ctxStars.beginPath();
              ctxStars.moveTo(star.x, star.y);
              ctxStars.lineTo(otherStar.x, otherStar.y);
              const opacity =
                (options.maxDistance - distance) / options.maxDistance;
              ctxStars.strokeStyle = options.connectionColor.replace(
                "${opacity}",
                opacity.toString()
              );
              ctxStars.lineWidth = options.lineThickness;
              if (options.connectionLinesDashed) {
                ctxStars.setLineDash(options.dashedLinesConfig);
              } else {
                ctxStars.setLineDash([]);
              }
              ctxStars.stroke();
            }
          });
        }
      }
    }
  });
  updateSpecialStars();
  drawSpecialStars();
  requestAnimationFrame(animateStars);
}

function createStars() {
  resizeCanvas();
  createSpecialStars();
  const numberOfStars =
    starDensities[options.starDensity] * canvasStars.width * canvasStars.height;
  for (let i = 0; i < numberOfStars; i++) {
    let x = Math.random() * canvasStars.width;
    let y = Math.random() * canvasStars.height;
    let star = new Star(x, y);
    stars.push(star);
    // Determine which cell this star belongs to
    let cellX = Math.floor(x / CELL_SIZE);
    let cellY = Math.floor(y / CELL_SIZE);
    // If the cell doesn't exist yet, create it
    if (!cells[cellX]) {
      cells[cellX] = {};
    }
    if (!cells[cellX][cellY]) {
      cells[cellX][cellY] = [];
    }
    // Add the star to the cell
    cells[cellX][cellY].push(star);
  }
}

window.addEventListener("click", function (event) {
  const x = event.x;
  const y = event.y;

  for (let i = 0; i < specialStars.length; i++) {
    const star = specialStars[i];
    const size = star.baseSize;
    const dx = x - star.x;
    const dy = y - star.y;
    if (Math.sqrt(dx * dx + dy * dy) <= size * 0.6) {
      if (!star.clicked) {
        star.clicked = true;
      }
      activeSpecialStar = star;
      showMessage(star.message || "ÔÝÎÞÄÚÈÝ");
      const messageBox = document.getElementById("messageBox");
      if (messageBox) {
        const rect = messageBox.getBoundingClientRect();
        const inset = Math.max(24, specialStarConfig.size * 0.3);
        star.targetX = rect.right - inset;
        star.targetY = rect.bottom - inset;
      } else {
        star.targetX = canvasStars.width / 2;
        star.targetY = canvasStars.height / 2;
      }
      return;
    }
  }

  if (!options.interactive) return;
  const star = new Star(x, y);
  stars.push(star);
});

if (overlay) {
  overlay.addEventListener("click", function () {
    hideMessage();
  });
}

resizeCanvas(); // This will draw the background.
createStars();
animateStars();

fetch("/api/messages")
  .then((response) => response.json())
  .then((data) => {
    data.forEach((item) => {
      specialStarMessages[item.id] = item.text;
    });
    specialStars.forEach((star) => {
      if (specialStarMessages[star.id]) {
        star.message = specialStarMessages[star.id];
      }
    });
  })
  .catch(() => {
    // Keep default empty messages if the API is unavailable.
  });

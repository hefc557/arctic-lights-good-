const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Core Variables
let frame = 0;
let score = 0;
let gameOver = false;
let isHoldingSpace = false;
let scrollSpeed = 8; 
let trail = []; 

// Player State
let player = { 
    x: 150, y: 225, size: 16, 
    dy: 0, gravity: 0.6, 
    mode: 'cube' // Starts as cube
};

// World Variables
let obstacles = [];
let portals = [];
let tunnel = [];
let tunnelGap = 200;
let currentCenterY = canvas.height / 2;

// Modes Sequence: cube -> ship -> wave
let nextModeScoreTarget = 10; 

// Controls
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !gameOver) {
    isHoldingSpace = true;
    // Cube jump logic
    if (player.mode === 'cube' && player.y >= canvas.height - 40 - player.size) {
        player.dy = -11;
    }
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "Space") isHoldingSpace = false;
});

function spawnPortal(type) {
    portals.push({ x: canvas.width, y: canvas.height / 2 - 40, width: 30, height: 80, type: type });
}

function updatePhysics() {
    if (player.mode === 'cube') {
        player.dy += player.gravity;
        player.y += player.dy;
        // Floor collision
        if (player.y >= canvas.height - 40 - player.size) {
            player.y = canvas.height - 40 - player.size;
            player.dy = 0;
        }
    } 
    else if (player.mode === 'ship') {
        if (isHoldingSpace) player.dy -= 0.4; // Fly up
        else player.dy += 0.4; // Fall down
        player.dy *= 0.9; // Friction/air resistance
        player.y += player.dy;
    } 
    else if (player.mode === 'wave') {
        if (isHoldingSpace) player.y -= 7;
        else player.y += 7;
    }

    // Ceiling/Floor boundaries for ship and wave
    if (player.mode !== 'cube') {
        if (player.y < player.size) { player.y = player.size; player.dy = 0; }
        if (player.y > canvas.height - player.size) { player.y = canvas.height - player.size; player.dy = 0; }
    }
}

function loop() {
  if (gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillText("ATTEMPT FAILED", canvas.width / 2, canvas.height / 2);
      ctx.font = "20px Arial";
      ctx.fillText("Refresh page to restart", canvas.width / 2, canvas.height / 2 + 40);
      return; 
  }

  // Neon Flashing Background
  let flashPhase = Math.floor(frame / 6) % 4; 
  let obstacleColor = flashPhase === 0 ? "#00ffff" : flashPhase === 1 ? "#0033aa" : flashPhase === 2 ? "#ffffff" : "#001144"; 

  ctx.fillStyle = "#02020a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePhysics();

  // Trail effect
  trail.push({ x: player.x, y: player.y });
  if (trail.length > 15) trail.shift();

  // Portal Logic
  if (score === nextModeScoreTarget && portals.length === 0) {
      if (player.mode === 'cube') spawnPortal('ship');
      else if (player.mode === 'ship') spawnPortal('wave');
  }

  for (let i = 0; i < portals.length; i++) {
      let p = portals[i];
      p.x -= scrollSpeed;
      
      // Draw Portal
      ctx.fillStyle = p.type === 'ship' ? "#ff00ff" : "#00ff00";
      ctx.shadowBlur = 20;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.shadowBlur = 0;

      // Portal Collision
      if (player.x < p.x + p.width && player.x + player.size > p.x) {
          player.mode = p.type;
          portals.splice(i, 1);
          nextModeScoreTarget += 10; // Set next milestone
          obstacles = []; // Clear old obstacles
          tunnel = []; // Clear tunnel
      }
  }

  // --- OBSTACLE GENERATION ---
  if (player.mode === 'cube' || player.mode === 'ship') {
      if (frame % 60 === 0 && portals.length === 0) {
          if (player.mode === 'cube') {
              obstacles.push({ x: canvas.width, y: canvas.height - 70, width: 30, height: 30 });
          } else if (player.mode === 'ship') {
              let h = Math.random() * 150 + 50;
              obstacles.push({ x: canvas.width, y: 0, width: 40, height: h }); // Top pillar
              obstacles.push({ x: canvas.width, y: h + 150, width: 40, height: canvas.height }); // Bottom pillar
          }
      }

      ctx.fillStyle = obstacleColor;
      for (let i = 0; i < obstacles.length; i++) {
          let obs = obstacles[i];
          obs.x -= scrollSpeed;
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

          // Collision
          if (player.x < obs.x + obs.width && player.x + player.size > obs.x &&
              player.y - player.size < obs.y + obs.height && player.y + player.size > obs.y) {
              gameOver = true;
          }
      }
      
      obstacles = obstacles.filter(obs => {
          if (obs.x + obs.width < 0) { score++; return false; }
          return true;
      });

      // Draw Ground for Cube
      if (player.mode === 'cube') {
          ctx.fillStyle = obstacleColor;
          ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      }
  } 
  
  // Wave Tunnel Generation
  else if (player.mode === 'wave') {
      if (tunnel.length === 0) {
          for (let i = 0; i <= canvas.width + 50; i += 50) {
              tunnel.push({ x: i, top: currentCenterY - tunnelGap / 2, bottom: currentCenterY + tunnelGap / 2 });
          }
      }

      for (let i = 0; i < tunnel.length; i++) tunnel[i].x -= scrollSpeed;

      if (tunnel[0].x < -50) {
          tunnel.shift();
          score++;
          let shift = (Math.random() * 100) - 50;
          currentCenterY += shift;
          if (currentCenterY < 100) currentCenterY = 100;
          if (currentCenterY > canvas.height - 100) currentCenterY = canvas.height - 100;

          tunnel.push({
              x: tunnel[tunnel.length - 1].x + 50,
              top: currentCenterY - tunnelGap / 2,
              bottom: currentCenterY + tunnelGap / 2
          });
      }

      // Draw Tunnel
      ctx.fillStyle = obstacleColor;
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let i = 0; i < tunnel.length; i++) ctx.lineTo(tunnel[i].x, tunnel[i].top);
      ctx.lineTo(canvas.width, 0); ctx.fill();

      ctx.beginPath(); ctx.moveTo(0, canvas.height);
      for (let i = 0; i < tunnel.length; i++) ctx.lineTo(tunnel[i].x, tunnel[i].bottom);
      ctx.lineTo(canvas.width, canvas.height); ctx.fill();

      // Wave Collision (Simplified radius check)
      let currentSeg = tunnel.find(t => t.x >= player.x - 50);
      if (currentSeg) {
          if (player.y - player.size < currentSeg.top || player.y + player.size > currentSeg.bottom) {
              gameOver = true;
          }
      }
  }

  // Draw Trail
  ctx.beginPath();
  for (let i=0; i<trail.length; i++) {
      if (i===0) ctx.moveTo(trail[i].x, trail[i].y);
      else ctx.lineTo(trail[i].x, trail[i].y);
  }
  ctx.strokeStyle = "rgba(255, 0, 100, 0.8)";
  ctx.lineWidth = player.size;
  ctx.stroke();

  // Draw Player
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#ff0066";
  ctx.fillRect(player.x - player.size/2, player.y - player.size/2, player.size, player.size);
  ctx.shadowBlur = 0;

  // Draw Score & Mode
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Score: " + score + " | Mode: " + player.mode.toUpperCase(), 20, 30);

  frame++;
  if (!gameOver) requestAnimationFrame(loop);
  else requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

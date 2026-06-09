let capture;
let handpose;
let predictions = [];
let aiChoice = "";
let playerChoice = ""; 
let gameState = "WAITING"; // WAITING, FIGHTING, RESULT
let modelLoaded = false;
let scores = { ai: 0, player: 0 };
let choices = ["黑熊 (草)", "獵人 (水)", "獵槍 (火)"];
let battleTimer = 0;
let resultText = "";
let bgParticles = [];
let startBtn;
let countdownValue = 3;
let countdownTimer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 嘗試啟動攝影機
  capture = createCapture(VIDEO, function(stream) {
    console.log("攝影機已啟動");
    // 初始化新版 handPose 模型
    handpose = ml5.handPose(capture, () => {
      console.log("手勢辨識模型已就緒！");
      modelLoaded = true;
    });
    
    // 開始持續偵測
    handpose.detectStart(capture, results => {
      predictions = results;
    });
  });

  capture.hide();
  textAlign(CENTER, CENTER);

  // 建立遊戲風格按鈕
  startBtn = createButton('開始戰鬥');
  styleStartButton();
  startBtn.mousePressed(startGame);

  // 初始化草原風動粒子 (模擬隨風飄動的草籽)
  for (let i = 0; i < 70; i++) {
    bgParticles.push({
      x: random(width),
      y: random(height),
      size: random(1, 4),
      speedX: random(1, 3), // 改為橫向移動
      amplitude: random(0.5, 2),
      phase: random(TWO_PI)
    });
  }
}

function styleStartButton() {
  // 使用 CSS 設定按鈕風格
  startBtn.position(width / 2, height / 2);
  startBtn.style('transform', 'translate(-50%, -50%)');
  startBtn.style('padding', '15px 40px');
  startBtn.style('font-size', '24px');
  startBtn.style('font-weight', 'bold');
  startBtn.style('background-color', '#567d46'); // 草原綠
  startBtn.style('color', '#ffffff');
  startBtn.style('border', '3px solid #F0E68C'); // 金色邊框
  startBtn.style('border-radius', '15px');
  startBtn.style('cursor', 'pointer');
  startBtn.style('box-shadow', '0 6px #2d4225'); // 按鈕陰影
  startBtn.style('transition', '0.2s');
  
  // 懸停效果
  startBtn.mouseOver(() => startBtn.style('background-color', '#6b9c57'));
  startBtn.mouseOut(() => startBtn.style('background-color', '#567d46'));
}

function draw() {
  // --- 繪製大草原背景 (天空、地平線、草地) ---
  let grad = drawingContext.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#87CEEB');   // 天空藍
  grad.addColorStop(0.5, '#F0E68C'); // 暖黃地平線
  grad.addColorStop(1, '#567d46');   // 草原綠
  
  drawingContext.fillStyle = grad;
  drawingContext.fillRect(0, 0, width, height);

  // 繪製並更新粒子 (隨風向右吹)
  noStroke();
  fill(255, 252, 220, 180); // 帶點奶油黃的粒子
  for (let p of bgParticles) {
    ellipse(p.x, p.y + sin(frameCount * 0.05 + p.phase) * p.amplitude, p.size);
    p.x += p.speedX;
    if (p.x > width) p.x = -10;
  }

  // --- 更新倒數計時邏輯 ---
  if (gameState === "FIGHTING") {
    if (millis() - countdownTimer > 1000) {
      countdownValue--;
      countdownTimer = millis();
      if (countdownValue <= 0) {
        executeBattle();
      }
    }
  }

  // --- 檢查遊戲結束狀態 ---
  if (gameState === "VICTORY") {
    drawVictoryScreen();
    return;
  } else if (gameState === "GAMEOVER") {
    drawGameOverScreen();
    return;
  }
  
  // 定義基礎布局
  let sectionW = width / 3;
  let camW = width * 0.4; // 稍微調整攝影機大小以符合佈局
  let camH = height * 0.5;

  // --- 左側：AI 出拳區域 ---
  drawAISide(0, 0, sectionW, height);

  // --- 右側：玩家攝影機區域 ---
  drawPlayerSide(width * 0.6, height * 0.25, camW, camH);

  // --- 中間：戰鬥與比分區域 ---
  drawBattleZone(sectionW, 0, width / 3, height);
  
  // 顯示當前比分
  drawScoreBoard();
}

function drawAISide(x, y, w, h) {
  // 繪製背景裝飾盒
  fill(40, 60, 40, 150); 
  rect(x + 20, y + 20, w - 40, h - 40, 20);
  
  // 繪製標題
  fill(255);
  textSize(24);
  text("大自然守護者 (AI)", x + w/2, y + 60);

  // 根據遊戲狀態顯示內容
  if (gameState === "FIGHTING") {
    fill(255, 215, 0); // 金色問號
    textSize(80);
    text("?", x + w/2, h/2);
  } else if (aiChoice !== "") {
    fill(255);
    textSize(40);
    push(); textStyle(BOLD); pop();
    text(aiChoice, x + w/2, h/2);
  }
}

function drawPlayerSide(x, y, w, h) {
  push();
  // 繪製攝影機容器
  translate(x + w/2, y + h/2);
  scale(-1, 1);
  imageMode(CENTER);
  // 改為暖色的陽光濾鏡感
  tint(255, 240, 200); 
  image(capture, 0, 0, w, h);
  
  // 繪製手部關鍵點（除錯用，讓你知道 AI 有沒有抓到你的手）
  drawHandPoints(w, h);
  
  // 在視訊中央加上即時偵測提示 (讓玩家在倒數時看到自己的狀態)
  let liveGesture = detectGesture();
  if (modelLoaded && liveGesture !== "" && (gameState === "WAITING" || gameState === "FIGHTING")) {
    scale(-1, 1); // 文字要翻轉回來才不會是鏡像
    fill(0, 255, 0);
    textSize(30);
    text(liveGesture, 0, h/2 - 50);
  }
  pop();
  
  // 玩家區域標籤
  fill(255);
  textSize(24);
  text("挑戰者 (你)", x + w/2, y - 30);
  
  if (gameState === "RESULT" && playerChoice !== "") {
    fill(255, 255, 0);
    textSize(32);
    text("你出了：" + playerChoice, x + w/2, y + h + 40);
  }
}

// 視覺化手部關鍵點，方便排查偵測問題
function drawHandPoints(w, h) {
  if (predictions && predictions.length > 0 && predictions[0].keypoints) {
    let keypoints = predictions[0].keypoints;
    
    // 繪製骨架連線
    stroke(0, 255, 0, 150);
    strokeWeight(2);
    drawSkeleton(keypoints, w, h);

    // 繪製節點
    noStroke();
    for (let i = 0; i < keypoints.length; i++) {
      // 將座標從影片原始尺寸映射到畫面顯示尺寸
      let px = map(keypoints[i].x, 0, capture.width || 640, -w / 2, w / 2);
      let py = map(keypoints[i].y, 0, capture.height || 480, -h / 2, h / 2);
      
      if (i === 8 || i === 12 || i === 16) fill(255, 0, 0); // 指尖顯示紅色
      else fill(0, 255, 0); // 其他點顯示綠色
      
      ellipse(px, py, 10, 10);
    }
  }
}

// 輔助函式：繪製手部骨架連線
function drawSkeleton(keypoints, w, h) {
  const connections = [
    [0, 1, 2, 3, 4],     // 大拇指
    [0, 5, 6, 7, 8],     // 食指
    [9, 10, 11, 12],     // 中指
    [13, 14, 15, 16],    // 無名指
    [0, 17, 18, 19, 20], // 小指
    [5, 9, 13, 17]       // 掌心連線
  ];

  for (let path of connections) {
    for (let i = 0; i < path.length - 1; i++) {
      let p1 = keypoints[path[i]];
      let p2 = keypoints[path[i+1]];
      
      let x1 = map(p1.x, 0, capture.width || 640, -w / 2, w / 2);
      let y1 = map(p1.y, 0, capture.height || 480, -h / 2, h / 2);
      let x2 = map(p2.x, 0, capture.width || 640, -w / 2, w / 2);
      let y2 = map(p2.y, 0, capture.height || 480, -h / 2, h / 2);
      
      line(x1, y1, x2, y2);
    }
  }
  // 額外連接掌心到小指根部
  let p0 = keypoints[0];
  let p17 = keypoints[17];
  line(map(p0.x,0,640,-w/2,w/2), map(p0.y,0,480,-h/2,h/2), map(p17.x,0,640,-w/2,w/2), map(p17.y,0,480,-h/2,h/2));
}

// 核心偵測邏輯：計算手指數量並對應角色
function detectGesture() {
  if (predictions && predictions.length > 0 && predictions[0].keypoints) {
    let keypoints = predictions[0].keypoints;
    
    // 指尖 Y 座標小於第二關節 Y 座標代表手指伸直（p5 座標 Y 是往下增加的）
    // 比較手指尖(8, 12, 16)與手指關節(6, 10, 14)的垂直位置
    let indexUp = keypoints[8].y < keypoints[6].y - 20;
    let middleUp = keypoints[12].y < keypoints[10].y - 20;
    let ringUp = keypoints[16].y < keypoints[14].y - 20;

    // 比 3 (食、中、無名指) -> 獵槍
    if (indexUp && middleUp && ringUp) return choices[2];
    // 比 2 (食、中指) -> 獵人
    if (indexUp && middleUp) return choices[1];
    // 比 1 (食指) -> 黑熊
    if (indexUp) return choices[0];
  }
  return "";
}

function drawVictoryScreen() {
  push();
  // 半透明金色光芒背景
  fill(240, 230, 140, 220); 
  rect(0, 0, width, height);
  
  fill(255);
  stroke(86, 125, 70); // 草原深綠邊框
  strokeWeight(8);
  textSize(100);
  text("大草原英雄！", width/2, height/2 - 120);
  
  noStroke();
  fill(40, 60, 40);
  textSize(32);
  text("你成功守護了自然的平衡", width/2, height/2 - 40);
  text(`最終比數 - 你: ${scores.player} | AI: ${scores.ai}`, width/2, height/2 + 20);
  pop();
  
  startBtn.show();
}

function drawGameOverScreen() {
  push();
  // 半透明深焦土色背景
  fill(101, 67, 33, 230); 
  rect(0, 0, width, height);
  
  fill(255, 100, 100);
  stroke(0);
  strokeWeight(8);
  textSize(100);
  text("挑戰失敗", width/2, height/2 - 120);
  
  noStroke();
  fill(255);
  textSize(32);
  text("大自然的力量超出了預期...", width/2, height/2 - 40);
  text(`最終比數 - 你: ${scores.player} | AI: ${scores.ai}`, width/2, height/2 + 20);
  pop();
  
  startBtn.show();
}

function drawBattleZone(x, y, w, h) {
  // 繪製中間的戰鬥指示
  if (gameState === "WAITING" || gameState === "VICTORY" || gameState === "GAMEOVER") {
    startBtn.show();
    textSize(24);
    fill(255);
    if (!capture.loadedmetadata) { // 檢查攝影機是否已啟動
      text("攝影機未啟動或權限被拒絕！", x + w/2, h/2 - 50);
      text("請檢查攝影機連線及瀏覽器權限。", x + w/2, h/2);
    } else if (!modelLoaded) { // 檢查模型是否載入
      text("AI 模型載入中...", x + w/2, h/2 - 50);
      text("請稍候。", x + w/2, h/2);
    } else if (predictions.length === 0) { // 檢查是否偵測到手部
      text("請將手部放入鏡頭中！", x + w/2, h/2 - 50);
      text("比出 1, 2 或 3 來準備。", x + w/2, h/2);
    } else { // 偵測到手部且模型已載入
      text("偵測到手勢：" + detectGesture(), x + w/2, h/2 - 50);
      text("點擊「開始戰鬥」按鈕。", x + w/2, h/2);
    }
  } else if (gameState === "FIGHTING") {
    startBtn.hide();
    textSize(120);
    fill(255, 215, 0); // 金色倒數數字
    stroke(0);
    strokeWeight(5);
    text(countdownValue, x + w/2, h/2);
    noStroke();
  } else {
    startBtn.hide();
    // 顯示勝負結果與粒子效果預留處
    textSize(48);
    fill(255, 50, 50);
    text(resultText, x + w/2, h/2);
  }
}

function drawScoreBoard() {
  textSize(28);
  fill(255);
  stroke(0);
  strokeWeight(3);
  text(`比數 - AI: ${scores.ai} | 玩家: ${scores.player}`, width/2, 40);
  noStroke();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 檢查按鈕是否存在，避免報錯
  if (startBtn && typeof startBtn.position === 'function') startBtn.position(width / 2, height / 2);
}

// 啟動遊戲邏輯 (修正原本遺漏的函式)
function startGame() {
  // 如果遊戲已結束，點擊後重置遊戲
  if (gameState === "VICTORY" || gameState === "GAMEOVER") {
    scores.ai = 0;
    scores.player = 0;
    aiChoice = "";
    playerChoice = "";
    resultText = "";
    gameState = "WAITING";
    startBtn.html('開始戰鬥');
    return;
  }

  if (!modelLoaded) {
    resultText = "模型還在準備中，請稍候...";
    return;
  }

  // 開始前先重置上一局的選擇
  aiChoice = "";
  playerChoice = "";

  // 開始倒數流程
  gameState = "FIGHTING";
  countdownValue = 3;
  countdownTimer = millis();
}

// 倒數結束後執行的判定邏輯
function executeBattle() {
  // 取得點擊按鈕當下的手勢辨識結果
  let gesture = detectGesture();
  if (gesture === "") {
    resultText = "未偵測到手勢，請再比一次！";
    gameState = "RESULT";
    setTimeout(() => { if(gameState === "RESULT") gameState = "WAITING"; }, 2000);
    return;
  }
  
  gameState = "RESULT";
  aiChoice = random(choices);
  playerChoice = gesture;
  
  // 判斷勝負
  if (playerChoice === aiChoice) {
    resultText = "平手！";
  } else if (
    (playerChoice === choices[0] && aiChoice === choices[1]) || // 黑熊(草) 贏 獵人(水)
    (playerChoice === choices[1] && aiChoice === choices[2]) || // 獵人(水) 贏 獵槍(火)
    (playerChoice === choices[2] && aiChoice === choices[0])    // 獵槍(火) 贏 黑熊(草)
  ) {
    resultText = "這一局你贏了！";
    scores.player++;
  } else {
    resultText = "這一局 AI 贏了！";
    scores.ai++;
  }

  // 檢查是否達成三戰兩勝
  if (scores.player >= 2) {
    setTimeout(() => { 
      gameState = "VICTORY"; 
      startBtn.html("重新開始");
    }, 2000);
  } else if (scores.ai >= 2) {
    setTimeout(() => { 
      gameState = "GAMEOVER"; 
      startBtn.html("重新開始");
    }, 2000);
  } else {
    // 尚未結束，回等待狀態準備下一局
    setTimeout(() => { gameState = "WAITING"; }, 3000);
  }
}

function keyPressed() {
  if (key === ' ') startGame();
}

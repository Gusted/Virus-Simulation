"use strict";
(() => {
  // src/simulatie.ts
  var type = {
    INT: "integer",
    PERCENT: "percent"
  };
  var GameValue = class {
    constructor(xPos, yPos, width, height, name, initialValue, type2, reset2) {
      this.xPos = xPos;
      this.yPos = yPos;
      this.width = width;
      this.height = height;
      this.name = name;
      this.displayString = name + ": ";
      this.value = initialValue;
      this.type = type2;
      this.mouseOver = false;
      this.promptModify = false;
      this.active = false;
      this.resetOnChange = reset2;
      values.push(this);
      clickers.push(this);
      hovers.push(this);
      keyers.push(this);
    }
    draw() {
      ctx.strokeStyle = colors.LGRAY;
      ctx.beginPath();
      ctx.rect(this.xPos, this.yPos, this.width, this.height);
      ctx.stroke();
      ctx.font = smallFontString;
      ctx.fillStyle = colors.HEALTHY;
      ctx.fillText(this.displayString + this.value + (this.type === type.PERCENT ? "%" : ""), this.xPos + this.width * 0.05, this.yPos + this.height * 0.8, this.width * 0.9);
      ctx.font = fontString;
    }
    drawPromptBox() {
      ctx.beginPath();
      ctx.rect(promptX, promptY, promptWidth, promptHeight);
      ctx.fillStyle = colors.BACKGROUND;
      ctx.fill();
      ctx.beginPath();
      ctx.rect(promptX, promptY, promptWidth, promptHeight);
      ctx.strokeStyle = colors.HEALTHY;
      ctx.stroke();
      ctx.font = smallFontString;
      ctx.fillStyle = colors.HEALTHY;
      ctx.fillText("Voer een nieuwe waarde in voor " + this.displayString, promptX + 10, promptY + 15, promptWidth * 0.95);
      ctx.fillText("> " + buffer, promptX + 10, promptY + 30, promptWidth * 0.95);
      ctx.font = fontString;
    }
    modify() {
      this.active = true;
      this.drawPromptBox();
    }
    clickHandler() {
      this.promptModify = true;
      buffer = "";
    }
    hoverHandler() {
      this.mouseOver = true;
    }
    mouseOutHandler() {
      this.mouseOver = false;
    }
    keyHandler(key) {
      if (this.active) {
        if (key >= "0" && key <= "9" || key == ".") {
          buffer = buffer + key;
        } else if (key == "Backspace") {
          buffer = buffer.slice(0, buffer.length - 1);
        } else if (key == "Enter") {
          this.promptModify = false;
          this.active = false;
          let result;
          if (this.type == type.INT) {
            result = parseInt(buffer);
          } else if (this.type == type.PERCENT) {
            result = parseFloat(buffer);
          }
          this.value = result;
          if (this.resetOnChange == true) {
            reset.value = flags.RESTART;
          }
        } else if (key == "Escape") {
          this.promptModify = false;
          this.active = false;
        }
      }
    }
  };
  var values = [];
  var clickers = [];
  var keyers = [];
  var hovers = [];
  var graphs = [];
  var clusters = [];
  var transmitProb = new GameValue(15, 300, 160, 15, "Transmissiekans", 10, type.PERCENT, false);
  var travelProb = new GameValue(15, 315, 160, 15, "Reiskans", 5, type.PERCENT, false);
  var startInfections = new GameValue(15, 330, 160, 15, "Begin infecties", 3, type.INT, false);
  var daysTilRecovery = new GameValue(15, 345, 160, 15, "Herstelperiode", 14, type.INT, false);
  var simulationSteps = 0;
  var promptX = 150;
  var promptY = 75;
  var promptWidth = 300;
  var promptHeight = 45;
  var communityRows;
  var communityColumns;
  var communityVerticalSize = 5;
  var communityHorizontalSize = 5;
  var numCommunities = new GameValue(15, 360, 160, 15, "Aantal huishoudens", 20, type.INT, true);
  var communities = [];
  var uniqueCommunityCount = 0;
  var commVertSpace = 100;
  var commHorzSpace = 100;
  var startVertOffset = 50;
  var startHorzOffset = 35;
  var desiredSimulationWidth = 400;
  var desiredSimulationHeight = 320;
  var glyphWidth = 14;
  var glyphHeight = 14;
  var colSpacePix = 0;
  var rowSpacePix = 0;
  var canvasName = "myCanvas";
  var canvas = document.getElementById(canvasName);
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  var canvasLeft = canvas.offsetLeft;
  var canvasTop = canvas.offsetTop;
  var canvasKeyHandler = (event) => keyers.forEach((keyer) => keyer.keyHandler(event.key));
  canvas.addEventListener("click", canvasClickHandler);
  canvas.addEventListener("mousemove", canvasMouseoverHandler);
  window.addEventListener("keydown", canvasKeyHandler);
  var fontSize = "14pt";
  var fontFamily = '"Lucida Console", Monaco, monospace';
  var fontString = fontSize + " " + fontFamily;
  ctx.font = fontString;
  var smallFontSize = "9pt";
  var smallFontString = smallFontSize + " " + fontFamily;
  var tickNumber = 0;
  var done = false;
  var animationFPS = 30;
  var animationTick = Math.floor(1e3 / animationFPS);
  var uniquePersonCount = 0;
  var sickCount = [startInfections.value];
  var sickTodayCount = [startInfections.value];
  var totalCases = [startInfections.value];
  var buffer = "";
  var speedControl = null;
  var runStop;
  var reset;
  var started = false;
  var restoreResetButton;
  var colors = {
    BACKGROUND: "#000",
    HEALTHY: "#00FF00",
    SICK: "#FF0000",
    RECOVERED: "#FFFF00",
    LGRAY: "rgb(189, 255, 189)"
  };
  var health = {
    HEALTHY: "healthy",
    SICK: "sick",
    RECOVERED: "recovered"
  };
  var speeds = {
    SPEED1: 60,
    SPEED2: 30,
    SPEED3: 15,
    SPEED4: 8,
    SPEED5: 2
  };
  var state = {
    RUN: "RUN",
    STOP: "STOP"
  };
  var flags = {
    NORMAL: "NORMAL",
    RESTART: "RESTART"
  };
  var Person = class {
    constructor(xPos, yPos, community, position) {
      this.state = health.HEALTHY;
      this.xPos = xPos;
      this.yPos = yPos;
      this.community = community;
      this.position = position;
      this.daysSick = 0;
      this.moving = false;
      this.moveToX = 0;
      this.moveToY = 0;
      this.startX = 0;
      this.startY = 0;
      this.moveFrame = 0;
      this.uniquePerson = uniquePersonCount++;
    }
    draw() {
      this.animate();
      switch (this.state) {
        case health.HEALTHY:
          ctx.fillStyle = colors.HEALTHY;
          break;
        case health.SICK:
          ctx.fillStyle = colors.SICK;
          break;
        case health.RECOVERED:
          ctx.fillStyle = colors.RECOVERED;
          break;
      }
      ctx.fillText("π", this.xPos, this.yPos, glyphWidth - colSpacePix * 2);
    }
    animate() {
      if (this.moving) {
        const interp = this.moveFrame / (speedControl.value - 1);
        this.xPos = this.startX * (1 - interp) + this.moveToX * interp;
        this.yPos = this.startY * (1 - interp) + this.moveToY * interp;
        this.moveFrame++;
      }
      if (this.moveFrame >= speedControl.value) {
        this.moving = false;
        this.moveFrame = 0;
      }
    }
    update() {
      if (this.state == health.SICK) {
        this.daysSick++;
      }
      if (this.daysSick > daysTilRecovery.value) {
        this.state = health.RECOVERED;
      }
    }
  };
  var Community = class {
    constructor(size, xPos, yPos) {
      this.pickRandomPerson = () => this.people[Math.floor(Math.random() * this.size)];
      this.countSick = () => this.people.filter((person) => person.state == health.SICK).length;
      this.countSickToday = () => this.people.filter((person) => person.state == health.SICK && !person.daysSick).length;
      this.countTotalCases = () => this.people.filter((person) => person.state != health.HEALTHY).length;
      this.countMoving = () => this.people.filter((person) => person.moving).length;
      this.update = () => this.people.forEach((person) => person.update());
      const linearSize = Math.ceil(Math.sqrt(size));
      this.uniqueCommunity = uniqueCommunityCount++;
      this.height = linearSize;
      this.width = linearSize;
      this.xPos = xPos;
      this.yPos = yPos;
      this.size = size;
      this.people = Array.from({length: size});
      for (let i = 0; i < size; i++) {
        const position = computeScreenPosition(this, i);
        this.people[i] = new Person(position[0], position[1], this, i);
      }
    }
    draw() {
      for (let i = 0; i < this.size; i++) {
        this.people[i].draw();
      }
      const leftX = this.xPos - glyphWidth;
      const rightX = this.xPos + (this.width + 1) * glyphWidth;
      const topY = this.yPos - 2 * glyphWidth;
      const botY = this.yPos + this.height * glyphWidth;
      ctx.beginPath();
      ctx.moveTo(leftX, topY);
      ctx.lineTo(rightX, topY);
      ctx.lineTo(rightX, botY);
      ctx.lineTo(leftX, botY);
      ctx.lineTo(leftX, topY);
      ctx.strokeStyle = colors.LGRAY;
      ctx.stroke();
    }
    spread() {
      const toSpread = [];
      for (let i = 0; i < this.size; i++) {
        if (this.people[i].state == health.SICK) {
          this.spreadHelper(this.getNorth(i), toSpread);
          this.spreadHelper(this.getSouth(i), toSpread);
          this.spreadHelper(this.getEast(i), toSpread);
          this.spreadHelper(this.getWest(i), toSpread);
        }
      }
      for (let i = 0, len = toSpread.length; i < len; i++) {
        const target = toSpread[i];
        this.people[target].state = health.SICK;
      }
    }
    getNorth(number) {
      const north = number - this.width;
      if (north < 0) {
        return null;
      }
      return number - this.width;
    }
    getSouth(number) {
      const south = number + this.width;
      if (south > this.size - 1) {
        return null;
      }
      return south;
    }
    getEast(number) {
      const col = number % this.width;
      if (col == this.width - 1) {
        return null;
      }
      return number + 1;
    }
    getWest(number) {
      const col = number % this.width;
      if (col == 0) {
        return null;
      }
      return number - 1;
    }
    spreadHelper(target, toSpread) {
      if (target == null) {
        return;
      }
      const targetHealth = this.people[target].state;
      const roll = Math.random();
      if (roll <= transmitProb.value / 100 && targetHealth == health.HEALTHY) {
        toSpread.push(target);
      }
    }
  };
  var Graph = class {
    constructor(dataVector, xPos, yPos, yHeight, xWidth, name) {
      this.data = dataVector;
      this.xPos = xPos;
      this.yPos = yPos;
      this.yHeight = yHeight;
      this.xWidth = xWidth;
      this.name = name;
      this.defaultBarSize = 5;
    }
    drawAxes() {
      const axisY = this.yPos + this.yHeight;
      ctx.beginPath();
      ctx.moveTo(this.xPos, this.yPos);
      ctx.lineTo(this.xPos, axisY);
      ctx.lineTo(this.xPos + this.xWidth, axisY);
      ctx.strokeStyle = colors.LGRAY;
      ctx.stroke();
    }
    drawName() {
      ctx.font = smallFontString;
      ctx.fillStyle = colors.HEALTHY;
      ctx.fillText(this.name, this.xPos, this.yPos - 10, this.xWidth);
      ctx.font = fontString;
    }
    drawYTicks() {
      const axisY = this.yPos + this.yHeight;
      ctx.fillStyle = colors.SICK;
      ctx.font = smallFontString;
      const maxVal = Math.max(...this.data);
      if (maxVal < this.yHeight) {
        const ticks = this.generateTickMarks(this.yHeight);
        for (let i = 0, len = ticks.length; i < len; i++) {
          ctx.fillText(`${ticks[i]}`, this.xPos - 2 * glyphWidth, axisY - ticks[i] + glyphHeight * 0.5);
          ctx.beginPath();
          ctx.moveTo(this.xPos, axisY - ticks[i]);
          ctx.lineTo(this.xPos - 5, axisY - ticks[i]);
          ctx.stroke();
        }
      } else {
        const ticks = this.generateTickMarks(maxVal);
        for (let i = 0, len = ticks.length; i < len; i++) {
          const tickMax = ticks[ticks.length - 1];
          ctx.fillText(`${ticks[i]}`, this.xPos - 2 * glyphWidth, axisY - ticks[i] / tickMax * this.yHeight + glyphHeight * 0.5);
          ctx.beginPath();
          ctx.moveTo(this.xPos, axisY - ticks[i] / tickMax * this.yHeight);
          ctx.lineTo(this.xPos - 5, axisY - ticks[i] / tickMax * this.yHeight);
          ctx.stroke();
        }
      }
      ctx.font = fontString;
    }
    drawXTicks() {
      const axisY = this.yPos + this.yHeight;
      ctx.fillStyle = colors.SICK;
      ctx.font = smallFontString;
      let barSize = this.defaultBarSize;
      const linesWidth = barSize * this.data.length;
      if (linesWidth > this.xWidth) {
        barSize = this.xWidth / this.data.length;
      }
      const dayCapacity = this.xWidth / barSize;
      const ticks = this.generateTickMarks(dayCapacity);
      let i;
      for (i = 0; i < ticks.length; i++) {
        ctx.fillText(`${ticks[i]}`, this.xPos + ticks[i] * barSize, axisY + glyphHeight);
      }
      ctx.font = fontString;
    }
    generateTickMarks(high) {
      let M;
      let numTicks;
      let k = 1;
      while (true) {
        M = 10 ** k;
        numTicks = Math.ceil(high / M);
        if (numTicks >= 4 && numTicks <= 9) {
          break;
        }
        M = 2 * 10 ** k;
        numTicks = Math.ceil(high / M);
        if (numTicks >= 4 && numTicks <= 9) {
          break;
        }
        M = 5 * 10 ** k;
        numTicks = Math.ceil(high / M);
        if (numTicks >= 4 && numTicks <= 9) {
          break;
        }
        k++;
      }
      const ticks = [];
      let i;
      for (i = 0; i <= numTicks; i++) {
        ticks.push(i * M);
      }
      return ticks;
    }
    drawData() {
      let i;
      let barSize = this.defaultBarSize;
      const axisY = this.yPos + this.yHeight;
      const linesWidth = barSize * this.data.length;
      if (linesWidth > this.xWidth) {
        barSize = this.xWidth / this.data.length;
      }
      const maxVal = Math.max(...this.data);
      ctx.fillStyle = colors.SICK;
      if (maxVal < this.yHeight) {
        for (i = 0; i < this.data.length; i++) {
          const topLeft = axisY - this.data[i];
          const xVal = this.xPos + i * barSize;
          ctx.beginPath();
          ctx.rect(xVal, topLeft, barSize, this.data[i]);
          ctx.fill();
        }
      } else {
        for (i = 0; i < this.data.length; i++) {
          const drawHeight = this.data[i] / maxVal * this.yHeight;
          const topLeft = axisY - drawHeight;
          const xVal = this.xPos + i * barSize;
          ctx.beginPath();
          ctx.rect(xVal, topLeft, barSize, drawHeight);
          ctx.fill();
        }
      }
    }
    draw() {
      this.drawName();
      this.drawAxes();
      this.drawYTicks();
      this.drawXTicks();
      this.drawData();
    }
  };
  var Button = class {
    constructor(xPos, yPos, width, height, label, value, cluster, initial, blink) {
      this.xPos = xPos;
      this.yPos = yPos;
      this.width = width;
      this.height = height;
      this.label = label;
      this.value = value;
      this.cluster = cluster;
      this.active = false;
      this.blink = blink;
      this.blinkStep = 0;
      clickers.push(this);
      if (initial == true) {
        this.active = true;
      }
    }
    clickHandler() {
      this.cluster.update(this.value);
      this.active = true;
      this.blinkStep = 0;
    }
    draw() {
      let text;
      let back;
      if (this.blink) {
        if (this.active == true && this.blinkStep % (animationFPS * 2) < animationFPS) {
          text = colors.BACKGROUND;
          back = colors.HEALTHY;
        } else {
          text = colors.HEALTHY;
          back = colors.BACKGROUND;
        }
      } else {
        if (this.active == true) {
          text = colors.BACKGROUND;
          back = colors.HEALTHY;
        } else {
          text = colors.HEALTHY;
          back = colors.BACKGROUND;
        }
      }
      ctx.beginPath();
      ctx.rect(this.xPos, this.yPos, this.width, this.height);
      ctx.fillStyle = back;
      ctx.fill();
      ctx.beginPath();
      ctx.rect(this.xPos, this.yPos, this.width, this.height);
      ctx.strokeStyle = colors.LGRAY;
      ctx.stroke();
      ctx.font = smallFontString;
      ctx.fillStyle = text;
      ctx.fillText(this.label, this.xPos + 5, this.yPos + 12, this.width * 0.9);
      ctx.font = fontString;
      this.blinkStep = this.blinkStep + 1;
    }
  };
  var Cluster = class {
    constructor(xPos, yPos, width, height, label) {
      this.update = (value) => this.insideValue = value;
      this.xPos = xPos;
      this.yPos = yPos;
      this.width = width;
      this.height = height;
      this.label = label;
      this.buttons = [];
      clusters.push(this);
      this.insideValue = null;
      this.value = null;
    }
    addButton(xPos, yPos, width, height, label, value, initial, blink) {
      const newButton = new Button(xPos, yPos, width, height, label, value, this, initial, blink);
      this.buttons.push(newButton);
      if (initial == true) {
        this.value = value;
        this.insideValue = value;
      }
      return newButton;
    }
    draw() {
      ctx.beginPath();
      ctx.rect(this.xPos, this.yPos - this.height, this.width, this.height);
      ctx.strokeStyle = colors.LGRAY;
      ctx.stroke();
      ctx.font = smallFontString;
      ctx.fillStyle = colors.HEALTHY;
      ctx.fillText(this.label, this.xPos + this.width * 0.05, this.yPos - this.height * 0.2, this.width * 0.9);
      ctx.font = fontString;
      let i;
      for (i = 0; i < this.buttons.length; i++) {
        this.buttons[i].draw();
      }
    }
    commit() {
      this.value = this.insideValue;
      let i;
      for (i = 0; i < this.buttons.length; i++) {
        if (this.value == this.buttons[i].value) {
          this.buttons[i].active = true;
        } else {
          this.buttons[i].active = false;
        }
      }
    }
  };
  function main() {
    setGraphics();
    buildWorld();
    setInitialInfections();
    if (started == false) {
      started = true;
      simulationTick();
    }
  }
  function resetSimulation() {
    graphs = [];
    simulationSteps = 0;
    communities = [];
    tickNumber = 0;
    done = false;
    sickCount = [startInfections.value];
    sickTodayCount = [startInfections.value];
    totalCases = [startInfections.value];
    buffer = "";
    main();
  }
  function simulationTick() {
    if (reset.value == flags.RESTART) {
      restoreResetButton.clickHandler(0, 0);
      resetSimulation();
    }
    if (tickNumber % speedControl.value == 0) {
      forcePositions();
    }
    drawWorld();
    if (countSick() == 0) {
      done = true;
    }
    let i;
    for (i = 0; i < keyers.length; i++) {
      if (keyers[i].promptModify == true) {
        keyers[i].modify();
        refireSimulation();
        return;
      }
    }
    if (tickNumber % speedControl.value == 0) {
      let i2;
      for (i2 = 0; i2 < clusters.length; i2++) {
        clusters[i2].commit();
      }
      if (runStop.value == state.STOP) {
        refireSimulation();
        return;
      }
      if (!done) {
        for (i2 = 0; i2 < communities.length; i2++) {
          communities[i2].update();
          communities[i2].spread();
        }
        updateCounters();
        travel();
        simulationSteps++;
      }
    }
    tickNumber++;
    refireSimulation();
  }
  function refireSimulation() {
    setTimeout(simulationTick, animationTick);
  }
  var drawGraphs = () => graphs.forEach((graph) => graph.draw());
  var drawValues = () => values.forEach((value) => value.draw());
  var drawClusters = () => clusters.forEach((cluster) => cluster.draw());
  function updateCounters() {
    sickCount.push(countSick());
    sickTodayCount.push(countSickToday());
    totalCases.push(countTotalCases());
  }
  function setGraphics() {
    const smallestSquare = Math.ceil(Math.sqrt(numCommunities.value));
    communityColumns = smallestSquare;
    communityRows = Math.ceil(numCommunities.value / smallestSquare);
  }
  function canvasClickHandler(event) {
    const x = event.pageX - canvasLeft;
    const y = event.pageY - canvasTop;
    for (let i = 0, len = clickers.length; i < len; i++) {
      const left = clickers[i].xPos;
      const right = clickers[i].xPos + clickers[i].width;
      const top = clickers[i].yPos;
      const bottom = clickers[i].yPos + clickers[i].height;
      if (x >= left && x <= right && y >= top && y <= bottom) {
        clickers[i].clickHandler();
      }
    }
  }
  function canvasMouseoverHandler(event) {
    const x = event.pageX - canvasLeft;
    const y = event.pageY - canvasTop;
    for (let i = 0, len = hovers.length; i < len; i++) {
      const left = hovers[i].xPos;
      const right = hovers[i].xPos + hovers[i].width;
      const top = hovers[i].yPos;
      const bottom = hovers[i].yPos + hovers[i].height;
      if (x >= left && x <= right && y >= top && y <= bottom) {
        hovers[i].hoverHandler();
      } else {
        hovers[i].mouseOutHandler();
      }
    }
  }
  var countSick = () => communities.map((community) => community.countSick()).reduce((a, b) => a + b);
  var countSickToday = () => communities.map((community) => community.countSickToday()).reduce((a, b) => a + b);
  var countTotalCases = () => communities.map((community) => community.countTotalCases()).reduce((a, b) => a + b);
  function forcePositions() {
    for (let i = 0, len = communities.length; i < len; i++) {
      for (let j = 0, len2 = communities[i].people.length; j < len2; j++) {
        const person = communities[i].people[j];
        const place = computeScreenPosition(person.community, person.position);
        person.xPos = place[0];
        person.yPos = place[1];
      }
    }
  }
  function computeScreenPosition(community, number) {
    const row = Math.floor(number / community.width);
    const col = number % community.width;
    const X = community.xPos + col * glyphWidth + colSpacePix;
    const Y = community.yPos + row * glyphHeight - rowSpacePix;
    return [X, Y];
  }
  function travel() {
    const numTravelers = pickNumTravelers();
    const numPairs = numTravelers / 2;
    for (let i = 0; i < numPairs; i++) {
      const personA = pickTraveler();
      personA.moving = true;
      personA.moveFrame = 0;
      let personB = pickTraveler();
      while (personB.community == personA.community) {
        personB = pickTraveler();
      }
      personB.moving = true;
      personB.moveFrame = 0;
      const startA = computeScreenPosition(personA.community, personA.position);
      const startB = computeScreenPosition(personB.community, personB.position);
      personA.startX = startA[0];
      personA.startY = startA[1];
      personB.startX = startB[0];
      personB.startY = startB[1];
      const destinationA = computeScreenPosition(personB.community, personB.position);
      const destinationB = computeScreenPosition(personA.community, personA.position);
      personA.moveToX = destinationA[0];
      personA.moveToY = destinationA[1];
      personB.moveToX = destinationB[0];
      personB.moveToY = destinationB[1];
      const commA = personA.community;
      const commB = personB.community;
      const placeA = personA.position;
      const placeB = personB.position;
      commA.people[placeA] = personB;
      commB.people[placeB] = personA;
      const tempComm = personA.community;
      const tempPos = personA.position;
      personA.community = personB.community;
      personA.position = personB.position;
      personB.community = tempComm;
      personB.position = tempPos;
    }
  }
  var scope;
  var newScope = () => scope = pickRandomCommunity().pickRandomPerson();
  function pickTraveler() {
    newScope();
    while (scope.moving) {
      newScope();
    }
    return scope;
  }
  function pickNumTravelers() {
    const totalPeople = computeTotalPeople();
    let totalTravellers = 0;
    for (let i = 0; i < totalPeople; i++) {
      if (Math.random() <= travelProb.value / 100) {
        totalTravellers++;
      }
    }
    totalTravellers % 2 && totalTravellers++;
    return totalTravellers;
  }
  var computeTotalPeople = () => communities.map((community) => community.size).reduce((a, b) => a + b);
  var pickRandomCommunity = () => communities[Math.floor(Math.random() * numCommunities.value)];
  function computeScaleFactor() {
    const totalWidth = 2 * startHorzOffset + commHorzSpace * communityColumns;
    const totalHeight = 2 * startVertOffset + commVertSpace * communityRows;
    const horzScaleFactor = desiredSimulationWidth / totalWidth;
    const vertScaleFactor = desiredSimulationHeight / totalHeight;
    return Math.min(horzScaleFactor, vertScaleFactor);
  }
  function drawWorld() {
    clear();
    ctx.fillStyle = colors.HEALTHY;
    ctx.fillText(`${simulationSteps}`, 10, 20);
    drawGraphs();
    drawValues();
    drawClusters();
    const scaleFactor = computeScaleFactor();
    const scaleDown = scaleFactor;
    const scaleUp = 1 / scaleFactor;
    ctx.scale(scaleDown, scaleDown);
    for (let i = 0; i < numCommunities.value; i++) {
      communities[i].draw();
    }
    ctx.scale(scaleUp, scaleUp);
  }
  var clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  function buildWorld() {
    communities = Array.from({length: numCommunities.value});
    for (let i = 0, len = numCommunities.value; i < len; i++) {
      const row = Math.floor(i / communityColumns);
      const col = i % communityColumns;
      const xPos = startHorzOffset + commHorzSpace * col;
      const yPos = startVertOffset + commVertSpace * row;
      communities[i] = new Community(communityVerticalSize * communityHorizontalSize, xPos, yPos);
    }
    graphs.push(new Graph(sickCount, 400, 20, 100, 300, "Ziek vandaag"), new Graph(sickTodayCount, 400, 165, 50, 300, "Nieuwe zieken per dag"), new Graph(totalCases, 400, 270, 100, 300, "Totaal aantal zieken"));
    if (!speedControl) {
      speedControl = new Cluster(200, 315, 100, 15, "Snelheid:");
      speedControl.addButton(200, 315, 20, 15, "1", speeds.SPEED1, false, false);
      speedControl.addButton(220, 315, 20, 15, "2", speeds.SPEED2, false, false);
      speedControl.addButton(240, 315, 20, 15, "3", speeds.SPEED3, true, false);
      speedControl.addButton(260, 315, 20, 15, "4", speeds.SPEED4, false, false);
      speedControl.addButton(280, 315, 20, 15, "5", speeds.SPEED5, false, false);
      runStop = new Cluster(200, 345, 100, 15, "Simulatie:");
      runStop.addButton(200, 345, 50, 15, "Start", state.RUN, false, true);
      runStop.addButton(250, 345, 50, 15, "Stop", state.STOP, true, true);
      reset = new Cluster(200, 390, 100, 15, "Simulatie Reset");
      restoreResetButton = reset.addButton(-100, -100, 1, 1, "Normal", flags.NORMAL, true, false);
      reset.addButton(300, 375, 60, 15, "Reset", flags.RESTART, false, false);
    }
  }
  function setInitialInfections() {
    let infections = 0;
    while (infections < startInfections.value) {
      const randCommunity = Math.floor(Math.random() * numCommunities.value);
      const thisCommunity = communities[randCommunity];
      const commSize = thisCommunity.size;
      const person = Math.floor(Math.random() * commSize);
      const personStatus = thisCommunity.people[person].state;
      if (personStatus == health.HEALTHY) {
        infections++;
        thisCommunity.people[person].state = health.SICK;
      }
    }
  }
  main();
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3NpbXVsYXRpZS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgdHlwZSA9IHtcbiAgICBJTlQ6ICdpbnRlZ2VyJyxcbiAgICBQRVJDRU5UOiAncGVyY2VudCdcbn07XG5cbmNsYXNzIEdhbWVWYWx1ZSB7XG4gICAgeFBvczogbnVtYmVyO1xuICAgIHlQb3M6IG51bWJlcjtcbiAgICB3aWR0aDogbnVtYmVyO1xuICAgIGhlaWdodDogbnVtYmVyO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBkaXNwbGF5U3RyaW5nOiBzdHJpbmc7XG4gICAgdmFsdWU6IG51bWJlcjtcbiAgICB0eXBlOiBzdHJpbmc7XG4gICAgbW91c2VPdmVyOiBib29sZWFuO1xuICAgIHByb21wdE1vZGlmeTogYm9vbGVhbjtcbiAgICBhY3RpdmU6IGJvb2xlYW47XG4gICAgcmVzZXRPbkNoYW5nZTogYm9vbGVhbjtcblxuICAgIGNvbnN0cnVjdG9yKHhQb3M6IG51bWJlciwgeVBvczogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbmFtZTogc3RyaW5nLCBpbml0aWFsVmFsdWU6IG51bWJlciwgdHlwZTogc3RyaW5nLCByZXNldDogYm9vbGVhbikge1xuICAgICAgICB0aGlzLnhQb3MgPSB4UG9zO1xuICAgICAgICB0aGlzLnlQb3MgPSB5UG9zO1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLmRpc3BsYXlTdHJpbmcgPSBuYW1lICsgJzogJztcbiAgICAgICAgdGhpcy52YWx1ZSA9IGluaXRpYWxWYWx1ZTtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5tb3VzZU92ZXIgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5wcm9tcHRNb2RpZnkgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5yZXNldE9uQ2hhbmdlID0gcmVzZXQ7XG4gICAgICAgIHZhbHVlcy5wdXNoKHRoaXMpO1xuICAgICAgICBjbGlja2Vycy5wdXNoKHRoaXMpO1xuICAgICAgICBob3ZlcnMucHVzaCh0aGlzKTtcbiAgICAgICAga2V5ZXJzLnB1c2godGhpcyk7XG4gICAgfVxuXG4gICAgZHJhdygpIHtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JzLkxHUkFZO1xuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIGN0eC5yZWN0KHRoaXMueFBvcywgdGhpcy55UG9zLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LmZvbnQgPSBzbWFsbEZvbnRTdHJpbmc7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcnMuSEVBTFRIWTtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMuZGlzcGxheVN0cmluZyArIHRoaXMudmFsdWUgKyAodGhpcy50eXBlID09PSB0eXBlLlBFUkNFTlQgPyAnJScgOiAnJyksIHRoaXMueFBvcyArIHRoaXMud2lkdGggKiAwLjA1LCB0aGlzLnlQb3MgKyB0aGlzLmhlaWdodCAqIDAuOCwgdGhpcy53aWR0aCAqIDAuOSk7XG4gICAgICAgIGN0eC5mb250ID0gZm9udFN0cmluZztcbiAgICB9XG5cbiAgICBkcmF3UHJvbXB0Qm94KCkge1xuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIGN0eC5yZWN0KHByb21wdFgsIHByb21wdFksIHByb21wdFdpZHRoLCBwcm9tcHRIZWlnaHQpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3JzLkJBQ0tHUk9VTkQ7XG4gICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LnJlY3QocHJvbXB0WCwgcHJvbXB0WSwgcHJvbXB0V2lkdGgsIHByb21wdEhlaWdodCk7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGNvbG9ycy5IRUFMVEhZO1xuICAgICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICAgIGN0eC5mb250ID0gc21hbGxGb250U3RyaW5nO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3JzLkhFQUxUSFk7XG4gICAgICAgIGN0eC5maWxsVGV4dCgnVm9lciBlZW4gbmlldXdlIHdhYXJkZSBpbiB2b29yICcgKyB0aGlzLmRpc3BsYXlTdHJpbmcsIHByb21wdFggKyAxMCwgcHJvbXB0WSArIDE1LCBwcm9tcHRXaWR0aCAqIDAuOTUpO1xuICAgICAgICBjdHguZmlsbFRleHQoJz4gJyArIGJ1ZmZlciwgcHJvbXB0WCArIDEwLCBwcm9tcHRZICsgMzAsIHByb21wdFdpZHRoICogMC45NSk7XG4gICAgICAgIGN0eC5mb250ID0gZm9udFN0cmluZztcblxuICAgIH1cblxuICAgIG1vZGlmeSgpIHtcbiAgICAgICAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuXG4gICAgICAgIHRoaXMuZHJhd1Byb21wdEJveCgpO1xuICAgIH1cblxuICAgIGNsaWNrSGFuZGxlcigpIHtcbiAgICAgICAgdGhpcy5wcm9tcHRNb2RpZnkgPSB0cnVlO1xuICAgICAgICBidWZmZXIgPSAnJztcbiAgICB9XG5cbiAgICBob3ZlckhhbmRsZXIoKSB7XG4gICAgICAgIHRoaXMubW91c2VPdmVyID0gdHJ1ZTtcbiAgICB9XG4gICAgbW91c2VPdXRIYW5kbGVyKCkge1xuICAgICAgICB0aGlzLm1vdXNlT3ZlciA9IGZhbHNlO1xuICAgIH1cblxuICAgIGtleUhhbmRsZXIoa2V5OiBzdHJpbmcgfCBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuYWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAoKGtleSA+PSAnMCcgJiYga2V5IDw9ICc5JykgfHwga2V5ID09ICcuJykge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlciArIGtleTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5ID09ICdCYWNrc3BhY2UnKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKDAsIGJ1ZmZlci5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5ID09ICdFbnRlcicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb21wdE1vZGlmeSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdDogbnVtYmVyO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgPT0gdHlwZS5JTlQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcGFyc2VJbnQoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PSB0eXBlLlBFUkNFTlQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcGFyc2VGbG9hdChidWZmZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlc2V0T25DaGFuZ2UgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNldC52YWx1ZSA9IGZsYWdzLlJFU1RBUlQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkgPT0gJ0VzY2FwZScpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb21wdE1vZGlmeSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuY29uc3QgdmFsdWVzOiBHYW1lVmFsdWVbXSA9IFtdO1xuY29uc3QgY2xpY2tlcnM6IGFueVtdID0gW107XG5jb25zdCBrZXllcnM6IEdhbWVWYWx1ZVtdID0gW107XG5jb25zdCBob3ZlcnM6IEdhbWVWYWx1ZVtdID0gW107XG5sZXQgZ3JhcGhzOiBHcmFwaFtdID0gW107XG5jb25zdCBjbHVzdGVyczogQ2x1c3RlcltdID0gW107XG5cbmNvbnN0IHRyYW5zbWl0UHJvYiA9IG5ldyBHYW1lVmFsdWUoMTUsIDMwMCwgMTYwLCAxNSwgJ1RyYW5zbWlzc2lla2FucycsIDEwLCB0eXBlLlBFUkNFTlQsIGZhbHNlKTtcbmNvbnN0IHRyYXZlbFByb2IgPSBuZXcgR2FtZVZhbHVlKDE1LCAzMTUsIDE2MCwgMTUsICdSZWlza2FucycsIDUsIHR5cGUuUEVSQ0VOVCwgZmFsc2UpO1xuY29uc3Qgc3RhcnRJbmZlY3Rpb25zID0gbmV3IEdhbWVWYWx1ZSgxNSwgMzMwLCAxNjAsIDE1LCAnQmVnaW4gaW5mZWN0aWVzJywgMywgdHlwZS5JTlQsIGZhbHNlKTtcbmNvbnN0IGRheXNUaWxSZWNvdmVyeSA9IG5ldyBHYW1lVmFsdWUoMTUsIDM0NSwgMTYwLCAxNSwgJ0hlcnN0ZWxwZXJpb2RlJywgMTQsIHR5cGUuSU5ULCBmYWxzZSk7XG5cbmxldCBzaW11bGF0aW9uU3RlcHMgPSAwO1xuXG5jb25zdCBwcm9tcHRYID0gMTUwO1xuY29uc3QgcHJvbXB0WSA9IDc1O1xuY29uc3QgcHJvbXB0V2lkdGggPSAzMDA7XG5jb25zdCBwcm9tcHRIZWlnaHQgPSA0NTtcblxubGV0IGNvbW11bml0eVJvd3M6IG51bWJlcjtcbmxldCBjb21tdW5pdHlDb2x1bW5zOiBudW1iZXI7XG5jb25zdCBjb21tdW5pdHlWZXJ0aWNhbFNpemUgPSA1O1xuY29uc3QgY29tbXVuaXR5SG9yaXpvbnRhbFNpemUgPSA1O1xuY29uc3QgbnVtQ29tbXVuaXRpZXMgPSBuZXcgR2FtZVZhbHVlKDE1LCAzNjAsIDE2MCwgMTUsICdBYW50YWwgaHVpc2hvdWRlbnMnLCAyMCwgdHlwZS5JTlQsIHRydWUpO1xubGV0IGNvbW11bml0aWVzOiBDb21tdW5pdHlbXSA9IFtdO1xubGV0IHVuaXF1ZUNvbW11bml0eUNvdW50ID0gMDtcblxuY29uc3QgY29tbVZlcnRTcGFjZSA9IDEwMDtcbmNvbnN0IGNvbW1Ib3J6U3BhY2UgPSAxMDA7XG5jb25zdCBzdGFydFZlcnRPZmZzZXQgPSA1MDtcbmNvbnN0IHN0YXJ0SG9yek9mZnNldCA9IDM1O1xuY29uc3QgZGVzaXJlZFNpbXVsYXRpb25XaWR0aCA9IDQwMDsgLy8gUGl4ZWxzXG5jb25zdCBkZXNpcmVkU2ltdWxhdGlvbkhlaWdodCA9IDMyMDsgLy8gUGl4ZWxzXG5cbmNvbnN0IGdseXBoV2lkdGggPSAxNDtcbmNvbnN0IGdseXBoSGVpZ2h0ID0gMTQ7XG5jb25zdCBjb2xTcGFjZVBpeCA9IDA7XG5jb25zdCByb3dTcGFjZVBpeCA9IDA7XG5cbmNvbnN0IGNhbnZhc05hbWUgPSAnbXlDYW52YXMnO1xuY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2FudmFzTmFtZSkgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG5jb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbmN0eC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbmNvbnN0IGNhbnZhc0xlZnQgPSBjYW52YXMub2Zmc2V0TGVmdDtcbmNvbnN0IGNhbnZhc1RvcCA9IGNhbnZhcy5vZmZzZXRUb3A7XG5cbmNvbnN0IGNhbnZhc0tleUhhbmRsZXIgPSAoZXZlbnQ6IEtleWJvYXJkRXZlbnQpID0+IGtleWVycy5mb3JFYWNoKChrZXllcikgPT4ga2V5ZXIua2V5SGFuZGxlcihldmVudC5rZXkpKTtcblxuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FudmFzQ2xpY2tIYW5kbGVyKTtcbmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBjYW52YXNNb3VzZW92ZXJIYW5kbGVyKTtcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgY2FudmFzS2V5SGFuZGxlcik7XG5cbmNvbnN0IGZvbnRTaXplID0gJzE0cHQnO1xuY29uc3QgZm9udEZhbWlseSA9ICdcIkx1Y2lkYSBDb25zb2xlXCIsIE1vbmFjbywgbW9ub3NwYWNlJztcbmNvbnN0IGZvbnRTdHJpbmcgPSBmb250U2l6ZSArICcgJyArIGZvbnRGYW1pbHk7XG5jdHguZm9udCA9IGZvbnRTdHJpbmc7XG5cbmNvbnN0IHNtYWxsRm9udFNpemUgPSAnOXB0JztcbmNvbnN0IHNtYWxsRm9udFN0cmluZyA9IHNtYWxsRm9udFNpemUgKyAnICcgKyBmb250RmFtaWx5O1xuXG5sZXQgdGlja051bWJlciA9IDA7XG5sZXQgZG9uZSA9IGZhbHNlO1xuXG5jb25zdCBhbmltYXRpb25GUFMgPSAzMDtcbmNvbnN0IGFuaW1hdGlvblRpY2sgPSBNYXRoLmZsb29yKDEwMDAgLyBhbmltYXRpb25GUFMpOyAvLyBpbiBtaWxsaXNlY29uZHNcblxubGV0IHVuaXF1ZVBlcnNvbkNvdW50ID0gMDtcblxubGV0IHNpY2tDb3VudCA9IFtzdGFydEluZmVjdGlvbnMudmFsdWVdO1xubGV0IHNpY2tUb2RheUNvdW50ID0gW3N0YXJ0SW5mZWN0aW9ucy52YWx1ZV07XG5sZXQgdG90YWxDYXNlcyA9IFtzdGFydEluZmVjdGlvbnMudmFsdWVdO1xuXG5sZXQgYnVmZmVyID0gJyc7XG5cbi8vIEJ1dHRvbiBDbHVzdGVyIHZhbHVlc1xubGV0IHNwZWVkQ29udHJvbCA9IG51bGw7XG5sZXQgcnVuU3RvcDogQ2x1c3RlcjtcbmxldCByZXNldDogQ2x1c3RlcjtcblxubGV0IHN0YXJ0ZWQgPSBmYWxzZTtcbmxldCByZXN0b3JlUmVzZXRCdXR0b246IHsgY2xpY2tIYW5kbGVyOiAoYXJnMDogbnVtYmVyLCBhcmcxOiBudW1iZXIpID0+IHZvaWQgfTtcblxuY29uc3QgY29sb3JzID0ge1xuICAgIEJBQ0tHUk9VTkQ6XHQnIzAwMCcsXG4gICAgSEVBTFRIWTpcdCcjMDBGRjAwJyxcbiAgICBTSUNLOlx0XHQnI0ZGMDAwMCcsXG4gICAgUkVDT1ZFUkVEOiBcdCcjRkZGRjAwJyxcbiAgICBMR1JBWTpcdFx0J3JnYigxODksIDI1NSwgMTg5KSdcbn07XG5cbmNvbnN0IGhlYWx0aCA9IHtcbiAgICBIRUFMVEhZOiAnaGVhbHRoeScsXG4gICAgU0lDSzogICdzaWNrJyxcbiAgICBSRUNPVkVSRUQ6ICdyZWNvdmVyZWQnXG59O1xuXG5jb25zdCBzcGVlZHMgPSB7XG4gICAgU1BFRUQxOlx0NjAsIC8vIDYwIGZyYW1lcywgb3IgYWJvdXQgMiBzZWNcbiAgICBTUEVFRDI6XHQzMCwgLy8gMzAgZnJhbWVzLCBvciBhYm91dCAxIHNlY1xuICAgIFNQRUVEMzpcdDE1LCAvLyAxNSBmcmFtZXMsIG9yIGFib3V0IDAuNSBzZWNcbiAgICBTUEVFRDQ6XHQ4LCAvLyA4IGZyYW1lcywgb3IgYWJvdXQgMC4yNSBzZWNcbiAgICBTUEVFRDU6XHQyIC8vIDIgZnJhbWUsIG9yIGFib3V0IDAuMDYgc2VjXG59O1xuXG5jb25zdCBzdGF0ZSA9IHtcbiAgICBSVU46ICdSVU4nLFxuICAgIFNUT1A6ICdTVE9QJ1xufTtcblxuXG5jb25zdCBmbGFncyA9IHtcbiAgICBOT1JNQUw6ICdOT1JNQUwnLFxuICAgIFJFU1RBUlQ6ICdSRVNUQVJUJ1xufTtcblxuY2xhc3MgUGVyc29uIHtcbiAgICBzdGF0ZTogc3RyaW5nO1xuICAgIHhQb3M6IG51bWJlcjtcbiAgICB5UG9zOiBudW1iZXI7XG4gICAgY29tbXVuaXR5OiBDb21tdW5pdHk7XG4gICAgcG9zaXRpb246IG51bWJlcjtcbiAgICBkYXlzU2ljazogbnVtYmVyO1xuICAgIG1vdmluZzogYm9vbGVhbjtcbiAgICBtb3ZlVG9YOiBudW1iZXI7XG4gICAgbW92ZVRvWTogbnVtYmVyO1xuICAgIHN0YXJ0WDogbnVtYmVyO1xuICAgIHN0YXJ0WTogbnVtYmVyO1xuICAgIG1vdmVGcmFtZTogbnVtYmVyO1xuICAgIHVuaXF1ZVBlcnNvbjogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IoeFBvczogbnVtYmVyLCB5UG9zOiBudW1iZXIsIGNvbW11bml0eTogQ29tbXVuaXR5LCBwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBoZWFsdGguSEVBTFRIWTtcbiAgICAgICAgdGhpcy54UG9zID0geFBvcztcbiAgICAgICAgdGhpcy55UG9zID0geVBvcztcbiAgICAgICAgdGhpcy5jb21tdW5pdHkgPSBjb21tdW5pdHk7XG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICAgICAgdGhpcy5kYXlzU2ljayA9IDA7XG4gICAgICAgIHRoaXMubW92aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMubW92ZVRvWCA9IDA7XG4gICAgICAgIHRoaXMubW92ZVRvWSA9IDA7XG4gICAgICAgIHRoaXMuc3RhcnRYID0gMDtcbiAgICAgICAgdGhpcy5zdGFydFkgPSAwO1xuICAgICAgICB0aGlzLm1vdmVGcmFtZSA9IDA7XG4gICAgICAgIHRoaXMudW5pcXVlUGVyc29uID0gdW5pcXVlUGVyc29uQ291bnQrKztcbiAgICB9XG5cbiAgICBkcmF3KCkge1xuICAgICAgICB0aGlzLmFuaW1hdGUoKTtcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIGhlYWx0aC5IRUFMVEhZOlxuICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcnMuSEVBTFRIWTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgaGVhbHRoLlNJQ0s6XG4gICAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9ycy5TSUNLO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBoZWFsdGguUkVDT1ZFUkVEOlxuICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcnMuUkVDT1ZFUkVEO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGN0eC5maWxsVGV4dCgnz4AnLCB0aGlzLnhQb3MsIHRoaXMueVBvcywgZ2x5cGhXaWR0aCAtIGNvbFNwYWNlUGl4ICogMik7XG5cbiAgICB9XG5cbiAgICBhbmltYXRlKCkge1xuICAgICAgICBpZiAodGhpcy5tb3ZpbmcpIHtcbiAgICAgICAgICAgIGNvbnN0IGludGVycCA9IHRoaXMubW92ZUZyYW1lIC8gKHNwZWVkQ29udHJvbC52YWx1ZSAtIDEpO1xuICAgICAgICAgICAgdGhpcy54UG9zID0gdGhpcy5zdGFydFggKiAoMSAtIGludGVycCkgKyB0aGlzLm1vdmVUb1ggKiBpbnRlcnA7XG4gICAgICAgICAgICB0aGlzLnlQb3MgPSB0aGlzLnN0YXJ0WSAqICgxIC0gaW50ZXJwKSArIHRoaXMubW92ZVRvWSAqIGludGVycDtcblxuICAgICAgICAgICAgdGhpcy5tb3ZlRnJhbWUrKztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLm1vdmVGcmFtZSA+PSBzcGVlZENvbnRyb2wudmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMubW92aW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLm1vdmVGcmFtZSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09IGhlYWx0aC5TSUNLKSB7XG4gICAgICAgICAgICB0aGlzLmRheXNTaWNrKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF5c1NpY2sgPiBkYXlzVGlsUmVjb3ZlcnkudmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBoZWFsdGguUkVDT1ZFUkVEO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIENvbW11bml0eSB7XG4gICAgdW5pcXVlQ29tbXVuaXR5OiBudW1iZXI7XG4gICAgaGVpZ2h0OiBudW1iZXI7XG4gICAgd2lkdGg6IG51bWJlcjtcbiAgICB4UG9zOiBudW1iZXI7XG4gICAgeVBvczogbnVtYmVyO1xuICAgIHNpemU6IG51bWJlcjtcbiAgICBwZW9wbGU6IFBlcnNvbltdO1xuXG4gICAgY29uc3RydWN0b3Ioc2l6ZTogbnVtYmVyLCB4UG9zOiBudW1iZXIsIHlQb3M6IG51bWJlcikge1xuICAgICAgICBjb25zdCBsaW5lYXJTaXplID0gTWF0aC5jZWlsKE1hdGguc3FydChzaXplKSk7XG4gICAgICAgIHRoaXMudW5pcXVlQ29tbXVuaXR5ID0gdW5pcXVlQ29tbXVuaXR5Q291bnQrKztcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBsaW5lYXJTaXplO1xuICAgICAgICB0aGlzLndpZHRoID0gbGluZWFyU2l6ZTtcbiAgICAgICAgdGhpcy54UG9zID0geFBvcztcbiAgICAgICAgdGhpcy55UG9zID0geVBvcztcbiAgICAgICAgdGhpcy5zaXplID0gc2l6ZTtcbiAgICAgICAgdGhpcy5wZW9wbGUgPSBBcnJheS5mcm9tKHtsZW5ndGg6IHNpemV9KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gY29tcHV0ZVNjcmVlblBvc2l0aW9uKHRoaXMsIGkpO1xuICAgICAgICAgICAgdGhpcy5wZW9wbGVbaV0gPSBuZXcgUGVyc29uKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSwgdGhpcywgaSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIGRyYXcoKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zaXplOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucGVvcGxlW2ldLmRyYXcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxlZnRYID0gdGhpcy54UG9zIC0gZ2x5cGhXaWR0aDtcbiAgICAgICAgY29uc3QgcmlnaHRYID0gdGhpcy54UG9zICsgKHRoaXMud2lkdGggKyAxKSAqIGdseXBoV2lkdGg7XG4gICAgICAgIGNvbnN0IHRvcFkgPSB0aGlzLnlQb3MgLSAyICogZ2x5cGhXaWR0aDtcbiAgICAgICAgY29uc3QgYm90WSA9IHRoaXMueVBvcyArICh0aGlzLmhlaWdodCkgKiBnbHlwaFdpZHRoO1xuXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4Lm1vdmVUbyhsZWZ0WCwgdG9wWSk7XG4gICAgICAgIGN0eC5saW5lVG8ocmlnaHRYLCB0b3BZKTtcbiAgICAgICAgY3R4LmxpbmVUbyhyaWdodFgsIGJvdFkpO1xuICAgICAgICBjdHgubGluZVRvKGxlZnRYLCBib3RZKTtcbiAgICAgICAgY3R4LmxpbmVUbyhsZWZ0WCwgdG9wWSk7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGNvbG9ycy5MR1JBWTtcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgIH1cblxuICAgIHNwcmVhZCgpIHtcbiAgICAgICAgY29uc3QgdG9TcHJlYWQgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNpemU7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMucGVvcGxlW2ldLnN0YXRlID09IGhlYWx0aC5TSUNLKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcHJlYWRIZWxwZXIodGhpcy5nZXROb3J0aChpKSwgdG9TcHJlYWQpOyAvLyBTcHJlYWQgbm9ydGhcbiAgICAgICAgICAgICAgICB0aGlzLnNwcmVhZEhlbHBlcih0aGlzLmdldFNvdXRoKGkpLCB0b1NwcmVhZCk7IC8vIFNwcmVhZCBzb3V0aFxuICAgICAgICAgICAgICAgIHRoaXMuc3ByZWFkSGVscGVyKHRoaXMuZ2V0RWFzdChpKSwgdG9TcHJlYWQpOyAvLyBTcHJlYWQgZWFzdFxuICAgICAgICAgICAgICAgIHRoaXMuc3ByZWFkSGVscGVyKHRoaXMuZ2V0V2VzdChpKSwgdG9TcHJlYWQpOyAvLyBTcHJlYWQgd2VzdFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gdG9TcHJlYWQubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IHRvU3ByZWFkW2ldO1xuICAgICAgICAgICAgdGhpcy5wZW9wbGVbdGFyZ2V0XS5zdGF0ZSA9IGhlYWx0aC5TSUNLO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0Tm9ydGgobnVtYmVyOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3Qgbm9ydGggPSBudW1iZXIgLSB0aGlzLndpZHRoO1xuICAgICAgICBpZiAobm9ydGggPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVtYmVyIC0gdGhpcy53aWR0aDtcbiAgICB9XG5cbiAgICBnZXRTb3V0aChudW1iZXI6IG51bWJlcikge1xuICAgICAgICBjb25zdCBzb3V0aCA9IG51bWJlciArIHRoaXMud2lkdGg7XG4gICAgICAgIGlmIChzb3V0aCA+ICh0aGlzLnNpemUgLSAxKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNvdXRoO1xuICAgIH1cblxuICAgIGdldEVhc3QobnVtYmVyOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgY29sID0gbnVtYmVyICUgdGhpcy53aWR0aDtcbiAgICAgICAgaWYgKGNvbCA9PSB0aGlzLndpZHRoIC0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bWJlciArIDE7XG4gICAgfVxuXG4gICAgZ2V0V2VzdChudW1iZXI6IG51bWJlcikge1xuICAgICAgICBjb25zdCBjb2wgPSBudW1iZXIgJSB0aGlzLndpZHRoO1xuICAgICAgICBpZiAoY29sID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudW1iZXIgLSAxO1xuICAgIH1cblxuICAgIHNwcmVhZEhlbHBlcih0YXJnZXQ6IG51bWJlciwgdG9TcHJlYWQ6IGFueVtdKSB7XG5cbiAgICAgICAgaWYgKHRhcmdldCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0YXJnZXRIZWFsdGggPSB0aGlzLnBlb3BsZVt0YXJnZXRdLnN0YXRlO1xuICAgICAgICBjb25zdCByb2xsID0gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgaWYgKHJvbGwgPD0gdHJhbnNtaXRQcm9iLnZhbHVlIC8gMTAwICYmIHRhcmdldEhlYWx0aCA9PSBoZWFsdGguSEVBTFRIWSkge1xuICAgICAgICAgICAgdG9TcHJlYWQucHVzaCh0YXJnZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcGlja1JhbmRvbVBlcnNvbiA9ICgpID0+IHRoaXMucGVvcGxlW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMuc2l6ZSldO1xuXG4gICAgY291bnRTaWNrID0gKCkgPT4gdGhpcy5wZW9wbGUuZmlsdGVyKChwZXJzb24pID0+IHBlcnNvbi5zdGF0ZSA9PSBoZWFsdGguU0lDSykubGVuZ3RoO1xuXG4gICAgY291bnRTaWNrVG9kYXkgPSAoKSA9PiB0aGlzLnBlb3BsZS5maWx0ZXIoKHBlcnNvbikgPT4gcGVyc29uLnN0YXRlID09IGhlYWx0aC5TSUNLICYmICFwZXJzb24uZGF5c1NpY2spLmxlbmd0aDtcblxuICAgIGNvdW50VG90YWxDYXNlcyA9ICgpID0+IHRoaXMucGVvcGxlLmZpbHRlcigocGVyc29uKSA9PiBwZXJzb24uc3RhdGUgIT0gaGVhbHRoLkhFQUxUSFkpLmxlbmd0aDtcblxuICAgIGNvdW50TW92aW5nID0gKCkgPT4gdGhpcy5wZW9wbGUuZmlsdGVyKChwZXJzb24pID0+IHBlcnNvbi5tb3ZpbmcpLmxlbmd0aDtcblxuICAgIHVwZGF0ZSA9ICgpID0+IHRoaXMucGVvcGxlLmZvckVhY2goKHBlcnNvbikgPT4gcGVyc29uLnVwZGF0ZSgpKTtcbn1cblxuXG5jbGFzcyBHcmFwaCB7XG4gICAgZGF0YTogc3RyaW5nIHwgYW55W107XG4gICAgeFBvczogbnVtYmVyO1xuICAgIHlQb3M6IG51bWJlcjtcbiAgICB5SGVpZ2h0OiBudW1iZXI7XG4gICAgeFdpZHRoOiBudW1iZXI7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGRlZmF1bHRCYXJTaXplOiBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3RvcihkYXRhVmVjdG9yOiBhbnlbXSwgeFBvczogbnVtYmVyLCB5UG9zOiBudW1iZXIsIHlIZWlnaHQ6IG51bWJlciwgeFdpZHRoOiBudW1iZXIsIG5hbWU6IHN0cmluZykge1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhVmVjdG9yO1xuICAgICAgICB0aGlzLnhQb3MgPSB4UG9zO1xuICAgICAgICB0aGlzLnlQb3MgPSB5UG9zO1xuICAgICAgICB0aGlzLnlIZWlnaHQgPSB5SGVpZ2h0O1xuICAgICAgICB0aGlzLnhXaWR0aCA9IHhXaWR0aDtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5kZWZhdWx0QmFyU2l6ZSA9IDU7XG4gICAgfVxuXG4gICAgZHJhd0F4ZXMoKSB7XG5cbiAgICAgICAgY29uc3QgYXhpc1kgPSB0aGlzLnlQb3MgKyB0aGlzLnlIZWlnaHQ7XG5cbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHgubW92ZVRvKHRoaXMueFBvcywgdGhpcy55UG9zKTtcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnhQb3MsIGF4aXNZKTtcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnhQb3MgKyB0aGlzLnhXaWR0aCwgYXhpc1kpO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBjb2xvcnMuTEdSQVk7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICB9XG5cbiAgICBkcmF3TmFtZSgpIHtcbiAgICAgICAgY3R4LmZvbnQgPSBzbWFsbEZvbnRTdHJpbmc7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcnMuSEVBTFRIWTtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54UG9zLCB0aGlzLnlQb3MgLSAxMCwgdGhpcy54V2lkdGgpO1xuICAgICAgICBjdHguZm9udCA9IGZvbnRTdHJpbmc7XG4gICAgfVxuXG4gICAgZHJhd1lUaWNrcygpIHtcbiAgICAgICAgY29uc3QgYXhpc1kgPSB0aGlzLnlQb3MgKyB0aGlzLnlIZWlnaHQ7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcnMuU0lDSztcbiAgICAgICAgY3R4LmZvbnQgPSBzbWFsbEZvbnRTdHJpbmc7XG4gICAgICAgIGNvbnN0IG1heFZhbCA9IE1hdGgubWF4KC4uLnRoaXMuZGF0YSk7XG4gICAgICAgIGlmIChtYXhWYWwgPCB0aGlzLnlIZWlnaHQpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpY2tzID0gdGhpcy5nZW5lcmF0ZVRpY2tNYXJrcyh0aGlzLnlIZWlnaHQpO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRpY2tzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGAke3RpY2tzW2ldfWAsIHRoaXMueFBvcyAtIDIgKiBnbHlwaFdpZHRoLCBheGlzWSAtIHRpY2tzW2ldICsgZ2x5cGhIZWlnaHQgKiAwLjUpO1xuICAgICAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICBjdHgubW92ZVRvKHRoaXMueFBvcywgYXhpc1kgLSB0aWNrc1tpXSk7XG4gICAgICAgICAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnhQb3MgLSA1LCBheGlzWSAtIHRpY2tzW2ldKTtcbiAgICAgICAgICAgICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0aWNrcyA9IHRoaXMuZ2VuZXJhdGVUaWNrTWFya3MobWF4VmFsKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0aWNrcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpY2tNYXggPSB0aWNrc1sgdGlja3MubGVuZ3RoIC0gMSBdO1xuICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dChgJHt0aWNrc1tpXX1gLCB0aGlzLnhQb3MgLSAyICogZ2x5cGhXaWR0aCwgYXhpc1kgLSAodGlja3NbaV0gLyB0aWNrTWF4KSAqIHRoaXMueUhlaWdodCArIGdseXBoSGVpZ2h0ICogMC41KTtcbiAgICAgICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgICAgY3R4Lm1vdmVUbyh0aGlzLnhQb3MsIGF4aXNZIC0gKHRpY2tzW2ldIC8gdGlja01heCkgKiB0aGlzLnlIZWlnaHQpO1xuICAgICAgICAgICAgICAgIGN0eC5saW5lVG8odGhpcy54UG9zIC0gNSwgYXhpc1kgLSAodGlja3NbaV0gLyB0aWNrTWF4KSAqIHRoaXMueUhlaWdodCk7XG4gICAgICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN0eC5mb250ID0gZm9udFN0cmluZztcbiAgICB9XG5cbiAgICBkcmF3WFRpY2tzKCkge1xuICAgICAgICBjb25zdCBheGlzWSA9IHRoaXMueVBvcyArIHRoaXMueUhlaWdodDtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9ycy5TSUNLO1xuICAgICAgICBjdHguZm9udCA9IHNtYWxsRm9udFN0cmluZztcblxuICAgICAgICBsZXQgYmFyU2l6ZSA9IHRoaXMuZGVmYXVsdEJhclNpemU7XG4gICAgICAgIGNvbnN0IGxpbmVzV2lkdGggPSBiYXJTaXplICogdGhpcy5kYXRhLmxlbmd0aDtcbiAgICAgICAgaWYgKGxpbmVzV2lkdGggPiB0aGlzLnhXaWR0aCkge1xuICAgICAgICAgICAgYmFyU2l6ZSA9IHRoaXMueFdpZHRoIC8gdGhpcy5kYXRhLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRheUNhcGFjaXR5ID0gdGhpcy54V2lkdGggLyBiYXJTaXplO1xuXG4gICAgICAgIGNvbnN0IHRpY2tzID0gdGhpcy5nZW5lcmF0ZVRpY2tNYXJrcyhkYXlDYXBhY2l0eSk7XG5cbiAgICAgICAgbGV0IGk6IG51bWJlcjtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHRpY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjdHguZmlsbFRleHQoYCR7dGlja3NbaV19YCwgdGhpcy54UG9zICsgdGlja3NbaV0gKiBiYXJTaXplLCBheGlzWSArIGdseXBoSGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGN0eC5mb250ID0gZm9udFN0cmluZztcbiAgICB9XG5cbiAgICBnZW5lcmF0ZVRpY2tNYXJrcyhoaWdoOiBudW1iZXIpIHtcblxuICAgICAgICBsZXQgTTogbnVtYmVyO1xuICAgICAgICBsZXQgbnVtVGlja3M6IG51bWJlcjtcbiAgICAgICAgbGV0IGsgPSAxO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuXG4gICAgICAgICAgICBNID0gMTAgKiogaztcbiAgICAgICAgICAgIG51bVRpY2tzID0gTWF0aC5jZWlsKGhpZ2ggLyBNKTtcbiAgICAgICAgICAgIGlmIChudW1UaWNrcyA+PSA0ICYmIG51bVRpY2tzIDw9IDkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE0gPSAyICogMTAgKiogaztcbiAgICAgICAgICAgIG51bVRpY2tzID0gTWF0aC5jZWlsKGhpZ2ggLyBNKTtcbiAgICAgICAgICAgIGlmIChudW1UaWNrcyA+PSA0ICYmIG51bVRpY2tzIDw9IDkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE0gPSA1ICogMTAgKiogaztcbiAgICAgICAgICAgIG51bVRpY2tzID0gTWF0aC5jZWlsKGhpZ2ggLyBNKTtcbiAgICAgICAgICAgIGlmIChudW1UaWNrcyA+PSA0ICYmIG51bVRpY2tzIDw9IDkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaysrO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdGlja3MgPSBbXTtcblxuICAgICAgICBsZXQgaTogbnVtYmVyO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDw9IG51bVRpY2tzOyBpKyspIHtcbiAgICAgICAgICAgIHRpY2tzLnB1c2goaSAqIE0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRpY2tzO1xuICAgIH1cblxuICAgIGRyYXdEYXRhKCkge1xuXG4gICAgICAgIGxldCBpOiBudW1iZXI7XG4gICAgICAgIGxldCBiYXJTaXplID0gdGhpcy5kZWZhdWx0QmFyU2l6ZTtcbiAgICAgICAgY29uc3QgYXhpc1kgPSB0aGlzLnlQb3MgKyB0aGlzLnlIZWlnaHQ7XG5cbiAgICAgICAgY29uc3QgbGluZXNXaWR0aCA9IGJhclNpemUgKiB0aGlzLmRhdGEubGVuZ3RoO1xuICAgICAgICBpZiAobGluZXNXaWR0aCA+IHRoaXMueFdpZHRoKSB7XG4gICAgICAgICAgICBiYXJTaXplID0gdGhpcy54V2lkdGggLyB0aGlzLmRhdGEubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1heFZhbCA9IE1hdGgubWF4KC4uLnRoaXMuZGF0YSk7XG5cbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9ycy5TSUNLO1xuXG4gICAgICAgIGlmIChtYXhWYWwgPCB0aGlzLnlIZWlnaHQpIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3BMZWZ0ID0gYXhpc1kgLSB0aGlzLmRhdGFbaV07XG4gICAgICAgICAgICAgICAgY29uc3QgeFZhbCA9IHRoaXMueFBvcyArIGkgKiBiYXJTaXplO1xuICAgICAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICBjdHgucmVjdCh4VmFsLCB0b3BMZWZ0LCBiYXJTaXplLCB0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkcmF3SGVpZ2h0ID0gKHRoaXMuZGF0YVtpXSAvIG1heFZhbCkgKiB0aGlzLnlIZWlnaHQ7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9wTGVmdCA9IGF4aXNZIC0gZHJhd0hlaWdodDtcbiAgICAgICAgICAgICAgICBjb25zdCB4VmFsID0gdGhpcy54UG9zICsgaSAqIGJhclNpemU7XG4gICAgICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgICAgIGN0eC5yZWN0KHhWYWwsIHRvcExlZnQsIGJhclNpemUsIGRyYXdIZWlnaHQpO1xuICAgICAgICAgICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGRyYXcoKSB7XG4gICAgICAgIHRoaXMuZHJhd05hbWUoKTtcbiAgICAgICAgdGhpcy5kcmF3QXhlcygpO1xuICAgICAgICB0aGlzLmRyYXdZVGlja3MoKTtcbiAgICAgICAgdGhpcy5kcmF3WFRpY2tzKCk7XG4gICAgICAgIHRoaXMuZHJhd0RhdGEoKTtcbiAgICB9XG5cbn1cblxuY2xhc3MgQnV0dG9uIHtcbiAgICB4UG9zOiBudW1iZXI7XG4gICAgeVBvczogbnVtYmVyO1xuICAgIHdpZHRoOiBudW1iZXI7XG4gICAgaGVpZ2h0OiBudW1iZXI7XG4gICAgbGFiZWw6IHN0cmluZztcbiAgICB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyO1xuICAgIGNsdXN0ZXI6IENsdXN0ZXI7XG4gICAgYWN0aXZlOiBib29sZWFuO1xuICAgIGJsaW5rOiBib29sZWFuO1xuICAgIGJsaW5rU3RlcDogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IoeFBvczogbnVtYmVyLCB5UG9zOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBsYWJlbDogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyLCBjbHVzdGVyOiBDbHVzdGVyLCBpbml0aWFsOiBib29sZWFuLCBibGluazogYm9vbGVhbikge1xuICAgICAgICB0aGlzLnhQb3MgPSB4UG9zO1xuICAgICAgICB0aGlzLnlQb3MgPSB5UG9zO1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLmxhYmVsID0gbGFiZWw7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5jbHVzdGVyID0gY2x1c3RlcjtcbiAgICAgICAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5ibGluayA9IGJsaW5rO1xuICAgICAgICB0aGlzLmJsaW5rU3RlcCA9IDA7XG4gICAgICAgIGNsaWNrZXJzLnB1c2godGhpcyk7XG4gICAgICAgIGlmIChpbml0aWFsID09IHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgY2xpY2tIYW5kbGVyKCkge1xuICAgICAgICB0aGlzLmNsdXN0ZXIudXBkYXRlKHRoaXMudmFsdWUpO1xuICAgICAgICB0aGlzLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMuYmxpbmtTdGVwID0gMDtcbiAgICB9XG5cbiAgICBkcmF3KCkge1xuICAgICAgICBsZXQgdGV4dDogc3RyaW5nO1xuICAgICAgICBsZXQgYmFjazogc3RyaW5nO1xuXG4gICAgICAgIGlmICh0aGlzLmJsaW5rKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hY3RpdmUgPT0gdHJ1ZSAmJiB0aGlzLmJsaW5rU3RlcCAlIChhbmltYXRpb25GUFMgKiAyKSA8IGFuaW1hdGlvbkZQUykge1xuICAgICAgICAgICAgICAgIHRleHQgPSBjb2xvcnMuQkFDS0dST1VORDtcbiAgICAgICAgICAgICAgICBiYWNrID0gY29sb3JzLkhFQUxUSFk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRleHQgPSBjb2xvcnMuSEVBTFRIWTtcbiAgICAgICAgICAgICAgICBiYWNrID0gY29sb3JzLkJBQ0tHUk9VTkQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIGlzIG5vdCBhIGJsaW5raW5nIGJ1dHRvblxuICAgICAgICAgICAgaWYgKHRoaXMuYWN0aXZlID09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB0ZXh0ID0gY29sb3JzLkJBQ0tHUk9VTkQ7XG4gICAgICAgICAgICAgICAgYmFjayA9IGNvbG9ycy5IRUFMVEhZO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0ZXh0ID0gY29sb3JzLkhFQUxUSFk7XG4gICAgICAgICAgICAgICAgYmFjayA9IGNvbG9ycy5CQUNLR1JPVU5EO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LnJlY3QodGhpcy54UG9zLCB0aGlzLnlQb3MsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGJhY2s7XG4gICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LnJlY3QodGhpcy54UG9zLCB0aGlzLnlQb3MsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JzLkxHUkFZO1xuICAgICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICAgIGN0eC5mb250ID0gc21hbGxGb250U3RyaW5nO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGV4dDtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMubGFiZWwsIHRoaXMueFBvcyArIDUsIHRoaXMueVBvcyArIDEyLCB0aGlzLndpZHRoICogMC45KTtcbiAgICAgICAgY3R4LmZvbnQgPSBmb250U3RyaW5nO1xuXG4gICAgICAgIHRoaXMuYmxpbmtTdGVwID0gdGhpcy5ibGlua1N0ZXAgKyAxO1xuICAgIH1cbn1cblxuY2xhc3MgQ2x1c3RlcntcbiAgICB4UG9zOiBudW1iZXI7XG4gICAgeVBvczogbnVtYmVyO1xuICAgIHdpZHRoOiBudW1iZXI7XG4gICAgaGVpZ2h0OiBudW1iZXI7XG4gICAgbGFiZWw6IHN0cmluZztcbiAgICBidXR0b25zOiBCdXR0b25bXTtcbiAgICBpbnNpZGVWYWx1ZTogc3RyaW5nIHwgbnVtYmVyO1xuICAgIHZhbHVlOiBzdHJpbmcgfCBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3Rvcih4UG9zOiBudW1iZXIsIHlQb3M6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGxhYmVsOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy54UG9zID0geFBvcztcbiAgICAgICAgdGhpcy55UG9zID0geVBvcztcbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5sYWJlbCA9IGxhYmVsO1xuICAgICAgICB0aGlzLmJ1dHRvbnMgPSBbXTtcbiAgICAgICAgY2x1c3RlcnMucHVzaCh0aGlzKTtcblxuICAgICAgICB0aGlzLmluc2lkZVZhbHVlID0gbnVsbDtcblxuICAgICAgICB0aGlzLnZhbHVlID0gbnVsbDtcbiAgICB9XG5cbiAgICBhZGRCdXR0b24oeFBvczogbnVtYmVyLCB5UG9zOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBsYWJlbDogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyLCBpbml0aWFsOiBib29sZWFuLCBibGluazogYm9vbGVhbikge1xuICAgICAgICBjb25zdCBuZXdCdXR0b24gPSBuZXcgQnV0dG9uKHhQb3MsIHlQb3MsIHdpZHRoLCBoZWlnaHQsIGxhYmVsLCB2YWx1ZSwgdGhpcywgaW5pdGlhbCwgYmxpbmspO1xuICAgICAgICB0aGlzLmJ1dHRvbnMucHVzaChuZXdCdXR0b24pO1xuICAgICAgICBpZiAoaW5pdGlhbCA9PSB0cnVlKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLmluc2lkZVZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0J1dHRvbjtcbiAgICB9XG5cbiAgICBkcmF3KCkge1xuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIGN0eC5yZWN0KHRoaXMueFBvcywgdGhpcy55UG9zIC0gdGhpcy5oZWlnaHQsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JzLkxHUkFZO1xuICAgICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICAgIGN0eC5mb250ID0gc21hbGxGb250U3RyaW5nO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3JzLkhFQUxUSFk7XG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLmxhYmVsLCB0aGlzLnhQb3MgKyB0aGlzLndpZHRoICogMC4wNSwgdGhpcy55UG9zIC0gdGhpcy5oZWlnaHQgKiAwLjIsIHRoaXMud2lkdGggKiAwLjkpO1xuICAgICAgICBjdHguZm9udCA9IGZvbnRTdHJpbmc7XG5cbiAgICAgICAgbGV0IGk6IG51bWJlcjtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5idXR0b25zW2ldLmRyYXcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZSA9ICh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKSA9PiB0aGlzLmluc2lkZVZhbHVlID0gdmFsdWU7XG5cbiAgICBjb21taXQoKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLmluc2lkZVZhbHVlO1xuXG4gICAgICAgIGxldCBpOiBudW1iZXI7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnZhbHVlID09IHRoaXMuYnV0dG9uc1tpXS52YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYnV0dG9uc1tpXS5hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1dHRvbnNbaV0uYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBtYWluKCkge1xuXG4gICAgc2V0R3JhcGhpY3MoKTtcblxuICAgIGJ1aWxkV29ybGQoKTtcblxuICAgIHNldEluaXRpYWxJbmZlY3Rpb25zKCk7XG5cbiAgICBpZiAoc3RhcnRlZCA9PSBmYWxzZSkge1xuICAgICAgICBzdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgc2ltdWxhdGlvblRpY2soKTtcbiAgICB9XG5cbn1cblxuZnVuY3Rpb24gcmVzZXRTaW11bGF0aW9uKCkge1xuXG4gICAgZ3JhcGhzID0gW107XG5cbiAgICBzaW11bGF0aW9uU3RlcHMgPSAwO1xuICAgIGNvbW11bml0aWVzID0gW107XG4gICAgdGlja051bWJlciA9IDA7XG4gICAgZG9uZSA9IGZhbHNlO1xuXG4gICAgc2lja0NvdW50ID0gW3N0YXJ0SW5mZWN0aW9ucy52YWx1ZV07XG4gICAgc2lja1RvZGF5Q291bnQgPSBbc3RhcnRJbmZlY3Rpb25zLnZhbHVlXTtcbiAgICB0b3RhbENhc2VzID0gW3N0YXJ0SW5mZWN0aW9ucy52YWx1ZV07XG5cbiAgICBidWZmZXIgPSAnJztcblxuICAgIG1haW4oKTtcbn1cblxuZnVuY3Rpb24gc2ltdWxhdGlvblRpY2soKSB7XG5cbiAgICBpZiAocmVzZXQudmFsdWUgPT0gZmxhZ3MuUkVTVEFSVCkge1xuICAgICAgICByZXN0b3JlUmVzZXRCdXR0b24uY2xpY2tIYW5kbGVyKDAsIDApO1xuICAgICAgICByZXNldFNpbXVsYXRpb24oKTtcbiAgICB9XG5cbiAgICBpZiAodGlja051bWJlciAlIHNwZWVkQ29udHJvbC52YWx1ZSA9PSAwKSB7XG4gICAgICAgIGZvcmNlUG9zaXRpb25zKCk7XG4gICAgfVxuXG4gICAgZHJhd1dvcmxkKCk7XG5cbiAgICBpZiAoY291bnRTaWNrKCkgPT0gMCkge1xuICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBsZXQgaTogbnVtYmVyO1xuICAgIGZvciAoaSA9IDA7IGkgPCBrZXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGtleWVyc1tpXS5wcm9tcHRNb2RpZnkgPT0gdHJ1ZSkge1xuICAgICAgICAgICAga2V5ZXJzW2ldLm1vZGlmeSgpO1xuICAgICAgICAgICAgcmVmaXJlU2ltdWxhdGlvbigpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvLyBTaW11bGF0aW9uIHN0dWZmIG5ldyBBcnJheShzaXplKTtcbiAgICBpZiAodGlja051bWJlciAlIHNwZWVkQ29udHJvbC52YWx1ZSA9PSAwKSB7XG5cbiAgICAgICAgbGV0IGk6IG51bWJlcjtcbiAgICAgICAgLy8gVXBkYXRlIHNpbXVsYXRpb24gdmFyaWFibGVzIG9ubHkgYXQgdGhlIGVuZCBvZiBhIHNpbXVsYXRpb24gc3RlcFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2x1c3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNsdXN0ZXJzW2ldLmNvbW1pdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJ1blN0b3AudmFsdWUgPT0gc3RhdGUuU1RPUCkge1xuICAgICAgICAgICAgcmVmaXJlU2ltdWxhdGlvbigpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkb25lKSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY29tbXVuaXRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb21tdW5pdGllc1tpXS51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICBjb21tdW5pdGllc1tpXS5zcHJlYWQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdXBkYXRlQ291bnRlcnMoKTtcblxuICAgICAgICAgICAgdHJhdmVsKCk7XG5cbiAgICAgICAgICAgIHNpbXVsYXRpb25TdGVwcysrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGlja051bWJlcisrO1xuXG4gICAgcmVmaXJlU2ltdWxhdGlvbigpO1xufVxuXG5mdW5jdGlvbiByZWZpcmVTaW11bGF0aW9uKCkge1xuICAgIHNldFRpbWVvdXQoc2ltdWxhdGlvblRpY2ssIGFuaW1hdGlvblRpY2spO1xufVxuXG5jb25zdCBkcmF3R3JhcGhzID0gKCkgPT4gZ3JhcGhzLmZvckVhY2goKGdyYXBoKSA9PiBncmFwaC5kcmF3KCkpO1xuY29uc3QgZHJhd1ZhbHVlcyA9ICgpID0+IHZhbHVlcy5mb3JFYWNoKCh2YWx1ZSkgPT4gdmFsdWUuZHJhdygpKTtcbmNvbnN0IGRyYXdDbHVzdGVycyA9ICgpID0+IGNsdXN0ZXJzLmZvckVhY2goKGNsdXN0ZXIpID0+IGNsdXN0ZXIuZHJhdygpKTtcblxuZnVuY3Rpb24gdXBkYXRlQ291bnRlcnMoKSB7XG4gICAgc2lja0NvdW50LnB1c2goY291bnRTaWNrKCkpO1xuICAgIHNpY2tUb2RheUNvdW50LnB1c2goY291bnRTaWNrVG9kYXkoKSk7XG4gICAgdG90YWxDYXNlcy5wdXNoKGNvdW50VG90YWxDYXNlcygpKTtcbn1cblxuZnVuY3Rpb24gc2V0R3JhcGhpY3MoKSB7XG4gICAgY29uc3Qgc21hbGxlc3RTcXVhcmUgPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KG51bUNvbW11bml0aWVzLnZhbHVlKSk7XG4gICAgY29tbXVuaXR5Q29sdW1ucyA9IHNtYWxsZXN0U3F1YXJlO1xuICAgIGNvbW11bml0eVJvd3MgPSBNYXRoLmNlaWwobnVtQ29tbXVuaXRpZXMudmFsdWUgLyBzbWFsbGVzdFNxdWFyZSk7XG59XG5cbmZ1bmN0aW9uIGNhbnZhc0NsaWNrSGFuZGxlcihldmVudDogeyBwYWdlWDogbnVtYmVyOyBwYWdlWTogbnVtYmVyIH0pIHtcbiAgICBjb25zdCB4ID0gZXZlbnQucGFnZVggLSBjYW52YXNMZWZ0O1xuICAgIGNvbnN0IHkgPSBldmVudC5wYWdlWSAtIGNhbnZhc1RvcDtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gY2xpY2tlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3QgbGVmdCA9IGNsaWNrZXJzW2ldLnhQb3M7XG4gICAgICAgIGNvbnN0IHJpZ2h0ID0gY2xpY2tlcnNbaV0ueFBvcyArIGNsaWNrZXJzW2ldLndpZHRoO1xuICAgICAgICBjb25zdCB0b3AgPSBjbGlja2Vyc1tpXS55UG9zO1xuICAgICAgICBjb25zdCBib3R0b20gPSBjbGlja2Vyc1tpXS55UG9zICsgY2xpY2tlcnNbaV0uaGVpZ2h0O1xuICAgICAgICBpZiAoeCA+PSBsZWZ0ICYmIHggPD0gcmlnaHQgJiYgeSA+PSB0b3AgJiYgeSA8PSBib3R0b20pIHtcbiAgICAgICAgICAgIGNsaWNrZXJzW2ldLmNsaWNrSGFuZGxlcigpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjYW52YXNNb3VzZW92ZXJIYW5kbGVyKGV2ZW50OiB7IHBhZ2VYOiBudW1iZXI7IHBhZ2VZOiBudW1iZXIgfSkge1xuICAgIGNvbnN0IHggPSBldmVudC5wYWdlWCAtIGNhbnZhc0xlZnQ7XG4gICAgY29uc3QgeSA9IGV2ZW50LnBhZ2VZIC0gY2FudmFzVG9wO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBob3ZlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3QgbGVmdCA9IGhvdmVyc1tpXS54UG9zO1xuICAgICAgICBjb25zdCByaWdodCA9IGhvdmVyc1tpXS54UG9zICsgaG92ZXJzW2ldLndpZHRoO1xuICAgICAgICBjb25zdCB0b3AgPSBob3ZlcnNbaV0ueVBvcztcbiAgICAgICAgY29uc3QgYm90dG9tID0gaG92ZXJzW2ldLnlQb3MgKyBob3ZlcnNbaV0uaGVpZ2h0O1xuICAgICAgICBpZiAoeCA+PSBsZWZ0ICYmIHggPD0gcmlnaHQgJiYgeSA+PSB0b3AgJiYgeSA8PSBib3R0b20pIHtcbiAgICAgICAgICAgIGhvdmVyc1tpXS5ob3ZlckhhbmRsZXIoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhvdmVyc1tpXS5tb3VzZU91dEhhbmRsZXIoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY29uc3QgY291bnRTaWNrID0gKCkgPT4gY29tbXVuaXRpZXMubWFwKChjb21tdW5pdHkpID0+IGNvbW11bml0eS5jb3VudFNpY2soKSkucmVkdWNlKChhLCBiKSA9PiBhICsgYik7XG5cbmNvbnN0IGNvdW50U2lja1RvZGF5ID0gKCkgPT4gY29tbXVuaXRpZXMubWFwKChjb21tdW5pdHkpID0+IGNvbW11bml0eS5jb3VudFNpY2tUb2RheSgpKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKTtcblxuY29uc3QgY291bnRUb3RhbENhc2VzID0gKCkgPT4gY29tbXVuaXRpZXMubWFwKChjb21tdW5pdHkpID0+IGNvbW11bml0eS5jb3VudFRvdGFsQ2FzZXMoKSkucmVkdWNlKChhLCBiKSA9PiBhICsgYik7XG5cbmZ1bmN0aW9uIGZvcmNlUG9zaXRpb25zKCkge1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBjb21tdW5pdGllcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBmb3IgKGxldCBqID0gMCwgbGVuMiA9IGNvbW11bml0aWVzW2ldLnBlb3BsZS5sZW5ndGg7IGogPCBsZW4yOyBqKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHBlcnNvbiA9IGNvbW11bml0aWVzW2ldLnBlb3BsZVtqXTtcbiAgICAgICAgICAgIGNvbnN0IHBsYWNlID0gY29tcHV0ZVNjcmVlblBvc2l0aW9uKHBlcnNvbi5jb21tdW5pdHksIHBlcnNvbi5wb3NpdGlvbik7XG4gICAgICAgICAgICBwZXJzb24ueFBvcyA9IHBsYWNlWzBdO1xuICAgICAgICAgICAgcGVyc29uLnlQb3MgPSBwbGFjZVsxXTtcbiAgICAgICAgfVxuICAgIH1cblxufVxuXG5mdW5jdGlvbiBjb21wdXRlU2NyZWVuUG9zaXRpb24oY29tbXVuaXR5OiBDb21tdW5pdHksIG51bWJlcjogbnVtYmVyKSB7XG4gICAgY29uc3Qgcm93ID0gTWF0aC5mbG9vcihudW1iZXIgLyBjb21tdW5pdHkud2lkdGgpO1xuICAgIGNvbnN0IGNvbCA9IG51bWJlciAlIGNvbW11bml0eS53aWR0aDtcbiAgICBjb25zdCBYID0gY29tbXVuaXR5LnhQb3MgKyBjb2wgKiBnbHlwaFdpZHRoICsgY29sU3BhY2VQaXg7XG4gICAgY29uc3QgWSA9IGNvbW11bml0eS55UG9zICsgcm93ICogZ2x5cGhIZWlnaHQgLSByb3dTcGFjZVBpeDtcbiAgICByZXR1cm4gW1gsIFldO1xufVxuXG5cbmZ1bmN0aW9uIHRyYXZlbCgpIHtcblxuICAgIGNvbnN0IG51bVRyYXZlbGVycyA9IHBpY2tOdW1UcmF2ZWxlcnMoKTtcbiAgICBjb25zdCBudW1QYWlycyA9IG51bVRyYXZlbGVycyAvIDI7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVBhaXJzOyBpKyspIHtcbiAgICAgICAgY29uc3QgcGVyc29uQSA9IHBpY2tUcmF2ZWxlcigpO1xuICAgICAgICBwZXJzb25BLm1vdmluZyA9IHRydWU7XG4gICAgICAgIHBlcnNvbkEubW92ZUZyYW1lID0gMDtcbiAgICAgICAgbGV0IHBlcnNvbkIgPSBwaWNrVHJhdmVsZXIoKTtcbiAgICAgICAgd2hpbGUgKHBlcnNvbkIuY29tbXVuaXR5ID09IHBlcnNvbkEuY29tbXVuaXR5KSB7XG4gICAgICAgICAgICBwZXJzb25CID0gcGlja1RyYXZlbGVyKCk7XG4gICAgICAgIH1cbiAgICAgICAgcGVyc29uQi5tb3ZpbmcgPSB0cnVlO1xuICAgICAgICBwZXJzb25CLm1vdmVGcmFtZSA9IDA7XG5cbiAgICAgICAgY29uc3Qgc3RhcnRBID0gY29tcHV0ZVNjcmVlblBvc2l0aW9uKHBlcnNvbkEuY29tbXVuaXR5LCBwZXJzb25BLnBvc2l0aW9uKTtcbiAgICAgICAgY29uc3Qgc3RhcnRCID0gY29tcHV0ZVNjcmVlblBvc2l0aW9uKHBlcnNvbkIuY29tbXVuaXR5LCBwZXJzb25CLnBvc2l0aW9uKTtcblxuICAgICAgICBwZXJzb25BLnN0YXJ0WCA9IHN0YXJ0QVswXTtcbiAgICAgICAgcGVyc29uQS5zdGFydFkgPSBzdGFydEFbMV07XG4gICAgICAgIHBlcnNvbkIuc3RhcnRYID0gc3RhcnRCWzBdO1xuICAgICAgICBwZXJzb25CLnN0YXJ0WSA9IHN0YXJ0QlsxXTtcblxuICAgICAgICBjb25zdCBkZXN0aW5hdGlvbkEgPSBjb21wdXRlU2NyZWVuUG9zaXRpb24ocGVyc29uQi5jb21tdW5pdHksIHBlcnNvbkIucG9zaXRpb24pO1xuICAgICAgICBjb25zdCBkZXN0aW5hdGlvbkIgPSBjb21wdXRlU2NyZWVuUG9zaXRpb24ocGVyc29uQS5jb21tdW5pdHksIHBlcnNvbkEucG9zaXRpb24pO1xuXG4gICAgICAgIHBlcnNvbkEubW92ZVRvWCA9IGRlc3RpbmF0aW9uQVswXTtcbiAgICAgICAgcGVyc29uQS5tb3ZlVG9ZID0gZGVzdGluYXRpb25BWzFdO1xuICAgICAgICBwZXJzb25CLm1vdmVUb1ggPSBkZXN0aW5hdGlvbkJbMF07XG4gICAgICAgIHBlcnNvbkIubW92ZVRvWSA9IGRlc3RpbmF0aW9uQlsxXTtcblxuICAgICAgICBjb25zdCBjb21tQSA9IHBlcnNvbkEuY29tbXVuaXR5O1xuICAgICAgICBjb25zdCBjb21tQiA9IHBlcnNvbkIuY29tbXVuaXR5O1xuICAgICAgICBjb25zdCBwbGFjZUEgPSBwZXJzb25BLnBvc2l0aW9uO1xuICAgICAgICBjb25zdCBwbGFjZUIgPSBwZXJzb25CLnBvc2l0aW9uO1xuXG4gICAgICAgIGNvbW1BLnBlb3BsZVtwbGFjZUFdID0gcGVyc29uQjtcbiAgICAgICAgY29tbUIucGVvcGxlW3BsYWNlQl0gPSBwZXJzb25BO1xuXG4gICAgICAgIGNvbnN0IHRlbXBDb21tID0gcGVyc29uQS5jb21tdW5pdHk7XG4gICAgICAgIGNvbnN0IHRlbXBQb3MgPSBwZXJzb25BLnBvc2l0aW9uO1xuICAgICAgICBwZXJzb25BLmNvbW11bml0eSA9IHBlcnNvbkIuY29tbXVuaXR5O1xuICAgICAgICBwZXJzb25BLnBvc2l0aW9uID0gcGVyc29uQi5wb3NpdGlvbjtcbiAgICAgICAgcGVyc29uQi5jb21tdW5pdHkgPSB0ZW1wQ29tbTtcbiAgICAgICAgcGVyc29uQi5wb3NpdGlvbiA9IHRlbXBQb3M7XG5cbiAgICB9XG5cbn1cblxubGV0IHNjb3BlOiBQZXJzb247XG5cbmNvbnN0IG5ld1Njb3BlID0gKCkgPT4gc2NvcGUgPSBwaWNrUmFuZG9tQ29tbXVuaXR5KCkucGlja1JhbmRvbVBlcnNvbigpO1xuXG5mdW5jdGlvbiBwaWNrVHJhdmVsZXIoKSB7XG4gICAgbmV3U2NvcGUoKTtcbiAgICB3aGlsZSAoc2NvcGUubW92aW5nKSB7XG4gICAgICAgIG5ld1Njb3BlKCk7XG4gICAgfVxuICAgIHJldHVybiBzY29wZTtcbn1cblxuZnVuY3Rpb24gcGlja051bVRyYXZlbGVycygpIHtcbiAgICBjb25zdCB0b3RhbFBlb3BsZSA9IGNvbXB1dGVUb3RhbFBlb3BsZSgpO1xuICAgIGxldCB0b3RhbFRyYXZlbGxlcnMgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG90YWxQZW9wbGU7IGkrKykge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8PSB0cmF2ZWxQcm9iLnZhbHVlIC8gMTAwKSB7XG4gICAgICAgICAgICB0b3RhbFRyYXZlbGxlcnMrKztcbiAgICAgICAgfVxuICAgIH1cbiAgICB0b3RhbFRyYXZlbGxlcnMgJSAyICYmIHRvdGFsVHJhdmVsbGVycysrO1xuXG4gICAgcmV0dXJuIHRvdGFsVHJhdmVsbGVycztcbn1cblxuY29uc3QgY29tcHV0ZVRvdGFsUGVvcGxlID0gKCkgPT4gY29tbXVuaXRpZXMubWFwKChjb21tdW5pdHkpID0+IGNvbW11bml0eS5zaXplKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKTtcblxuY29uc3QgcGlja1JhbmRvbUNvbW11bml0eSA9ICgpID0+IGNvbW11bml0aWVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG51bUNvbW11bml0aWVzLnZhbHVlKV07XG5cbmZ1bmN0aW9uIGNvbXB1dGVTY2FsZUZhY3RvcigpIHtcbiAgICBjb25zdCB0b3RhbFdpZHRoID0gMiAqIHN0YXJ0SG9yek9mZnNldCArIGNvbW1Ib3J6U3BhY2UgKiBjb21tdW5pdHlDb2x1bW5zO1xuICAgIGNvbnN0IHRvdGFsSGVpZ2h0ID0gMiAqIHN0YXJ0VmVydE9mZnNldCArIGNvbW1WZXJ0U3BhY2UgKiBjb21tdW5pdHlSb3dzO1xuICAgIGNvbnN0IGhvcnpTY2FsZUZhY3RvciA9IGRlc2lyZWRTaW11bGF0aW9uV2lkdGggLyB0b3RhbFdpZHRoO1xuICAgIGNvbnN0IHZlcnRTY2FsZUZhY3RvciA9IGRlc2lyZWRTaW11bGF0aW9uSGVpZ2h0IC8gdG90YWxIZWlnaHQ7XG4gICAgcmV0dXJuIE1hdGgubWluKGhvcnpTY2FsZUZhY3RvciwgdmVydFNjYWxlRmFjdG9yKTtcbn1cblxuZnVuY3Rpb24gZHJhd1dvcmxkKCkge1xuICAgIGNsZWFyKCk7XG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9ycy5IRUFMVEhZO1xuICAgIGN0eC5maWxsVGV4dChgJHtzaW11bGF0aW9uU3RlcHN9YCwgMTAsIDIwKTtcblxuICAgIGRyYXdHcmFwaHMoKTtcbiAgICBkcmF3VmFsdWVzKCk7XG4gICAgZHJhd0NsdXN0ZXJzKCk7XG5cbiAgICBjb25zdCBzY2FsZUZhY3RvciA9IGNvbXB1dGVTY2FsZUZhY3RvcigpO1xuICAgIGNvbnN0IHNjYWxlRG93biA9IHNjYWxlRmFjdG9yO1xuICAgIGNvbnN0IHNjYWxlVXAgPSAxIC8gc2NhbGVGYWN0b3I7XG5cbiAgICBjdHguc2NhbGUoc2NhbGVEb3duLCBzY2FsZURvd24pO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtQ29tbXVuaXRpZXMudmFsdWU7IGkrKykge1xuICAgICAgICBjb21tdW5pdGllc1tpXS5kcmF3KCk7XG4gICAgfVxuICAgIGN0eC5zY2FsZShzY2FsZVVwLCBzY2FsZVVwKTtcblxufVxuXG5jb25zdCBjbGVhciA9ICgpID0+IGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblxuZnVuY3Rpb24gYnVpbGRXb3JsZCgpIHtcbiAgICBjb21tdW5pdGllcyA9IEFycmF5LmZyb20oe2xlbmd0aDogbnVtQ29tbXVuaXRpZXMudmFsdWV9KTtcblxuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBudW1Db21tdW5pdGllcy52YWx1ZTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHJvdyA9IE1hdGguZmxvb3IoaSAvIGNvbW11bml0eUNvbHVtbnMpO1xuICAgICAgICBjb25zdCBjb2wgPSBpICUgY29tbXVuaXR5Q29sdW1ucztcblxuICAgICAgICBjb25zdCB4UG9zID0gc3RhcnRIb3J6T2Zmc2V0ICsgY29tbUhvcnpTcGFjZSAqIGNvbDtcbiAgICAgICAgY29uc3QgeVBvcyA9IHN0YXJ0VmVydE9mZnNldCArIGNvbW1WZXJ0U3BhY2UgKiByb3c7XG5cbiAgICAgICAgY29tbXVuaXRpZXNbaV0gPSBuZXcgQ29tbXVuaXR5KGNvbW11bml0eVZlcnRpY2FsU2l6ZSAqIGNvbW11bml0eUhvcml6b250YWxTaXplLCB4UG9zLCB5UG9zKTtcbiAgICB9XG5cbiAgICBncmFwaHMucHVzaChuZXcgR3JhcGgoc2lja0NvdW50LCA0MDAsIDIwLCAxMDAsIDMwMCwgJ1ppZWsgdmFuZGFhZycpLCBuZXcgR3JhcGgoc2lja1RvZGF5Q291bnQsIDQwMCwgMTY1LCA1MCwgMzAwLCAnTmlldXdlIHppZWtlbiBwZXIgZGFnJyksIG5ldyBHcmFwaCh0b3RhbENhc2VzLCA0MDAsIDI3MCwgMTAwLCAzMDAsICdUb3RhYWwgYWFudGFsIHppZWtlbicpKTtcblxuICAgIGlmICghc3BlZWRDb250cm9sKSB7XG4gICAgICAgIHNwZWVkQ29udHJvbCA9IG5ldyBDbHVzdGVyKDIwMCwgMzE1LCAxMDAsIDE1LCAnU25lbGhlaWQ6Jyk7XG4gICAgICAgIHNwZWVkQ29udHJvbC5hZGRCdXR0b24oMjAwLCAzMTUsIDIwLCAxNSwgJzEnLCBzcGVlZHMuU1BFRUQxLCBmYWxzZSwgZmFsc2UpO1xuICAgICAgICBzcGVlZENvbnRyb2wuYWRkQnV0dG9uKDIyMCwgMzE1LCAyMCwgMTUsICcyJywgc3BlZWRzLlNQRUVEMiwgZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgc3BlZWRDb250cm9sLmFkZEJ1dHRvbigyNDAsIDMxNSwgMjAsIDE1LCAnMycsIHNwZWVkcy5TUEVFRDMsIHRydWUsIGZhbHNlKTtcbiAgICAgICAgc3BlZWRDb250cm9sLmFkZEJ1dHRvbigyNjAsIDMxNSwgMjAsIDE1LCAnNCcsIHNwZWVkcy5TUEVFRDQsIGZhbHNlLCBmYWxzZSk7XG4gICAgICAgIHNwZWVkQ29udHJvbC5hZGRCdXR0b24oMjgwLCAzMTUsIDIwLCAxNSwgJzUnLCBzcGVlZHMuU1BFRUQ1LCBmYWxzZSwgZmFsc2UpO1xuXG4gICAgICAgIHJ1blN0b3AgPSBuZXcgQ2x1c3RlcigyMDAsIDM0NSwgMTAwLCAxNSwgJ1NpbXVsYXRpZTonKTtcbiAgICAgICAgcnVuU3RvcC5hZGRCdXR0b24oMjAwLCAzNDUsIDUwLCAxNSwgJ1N0YXJ0Jywgc3RhdGUuUlVOLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIHJ1blN0b3AuYWRkQnV0dG9uKDI1MCwgMzQ1LCA1MCwgMTUsICdTdG9wJywgc3RhdGUuU1RPUCwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAgICAgcmVzZXQgPSBuZXcgQ2x1c3RlcigyMDAsIDM5MCwgMTAwLCAxNSwgJ1NpbXVsYXRpZSBSZXNldCcpO1xuICAgICAgICByZXN0b3JlUmVzZXRCdXR0b24gPSByZXNldC5hZGRCdXR0b24oLTEwMCwgLTEwMCwgMSwgMSwgJ05vcm1hbCcsIGZsYWdzLk5PUk1BTCwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgICByZXNldC5hZGRCdXR0b24oMzAwLCAzNzUsIDYwLCAxNSwgJ1Jlc2V0JywgZmxhZ3MuUkVTVEFSVCwgZmFsc2UsIGZhbHNlKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gc2V0SW5pdGlhbEluZmVjdGlvbnMoKSB7XG4gICAgbGV0IGluZmVjdGlvbnMgPSAwO1xuICAgIHdoaWxlIChpbmZlY3Rpb25zIDwgc3RhcnRJbmZlY3Rpb25zLnZhbHVlKSB7XG4gICAgICAgIGNvbnN0IHJhbmRDb21tdW5pdHkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBudW1Db21tdW5pdGllcy52YWx1ZSk7XG4gICAgICAgIGNvbnN0IHRoaXNDb21tdW5pdHkgPSBjb21tdW5pdGllc1tyYW5kQ29tbXVuaXR5XTtcbiAgICAgICAgY29uc3QgY29tbVNpemUgPSB0aGlzQ29tbXVuaXR5LnNpemU7XG4gICAgICAgIGNvbnN0IHBlcnNvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNvbW1TaXplKTtcbiAgICAgICAgY29uc3QgcGVyc29uU3RhdHVzID0gdGhpc0NvbW11bml0eS5wZW9wbGVbcGVyc29uXS5zdGF0ZTtcbiAgICAgICAgaWYgKHBlcnNvblN0YXR1cyA9PSBoZWFsdGguSEVBTFRIWSkge1xuICAgICAgICAgICAgaW5mZWN0aW9ucysrO1xuICAgICAgICAgICAgdGhpc0NvbW11bml0eS5wZW9wbGVbcGVyc29uXS5zdGF0ZSA9IGhlYWx0aC5TSUNLO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbm1haW4oKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7OztBQUFBLE1BQU0sT0FBTztBQUFBLElBQ1QsS0FBSztBQUFBLElBQ0wsU0FBUztBQUFBO0FBRmI7QUFBQSxJQW1CSSxZQUFZLE1BQWMsTUFBYyxPQUFlLFFBQWdCLE1BQWMsY0FBc0IsT0FBYztBQUNySCxXQUFLLE9BQU87QUFDWixXQUFLLE9BQU87QUFDWixXQUFLLFFBQVE7QUFDYixXQUFLLFNBQVM7QUFDZCxXQUFLLE9BQU87QUFDWixXQUFLLGdCQUFnQixPQUFPO0FBQzVCLFdBQUssUUFBUTtBQUNiLFdBQUssT0FBTztBQUNaLFdBQUssWUFBWTtBQUNqQixXQUFLLGVBQWU7QUFDcEIsV0FBSyxTQUFTO0FBQ2QsV0FBSyxnQkFBZ0I7QUFDckIsYUFBTyxLQUFLO0FBQ1osZUFBUyxLQUFLO0FBQ2QsYUFBTyxLQUFLO0FBQ1osYUFBTyxLQUFLO0FBQUE7QUFBQSxJQUdoQjtBQUNJLFVBQUksY0FBYyxPQUFPO0FBQ3pCLFVBQUk7QUFDSixVQUFJLEtBQUssS0FBSyxNQUFNLEtBQUssTUFBTSxLQUFLLE9BQU8sS0FBSztBQUNoRCxVQUFJO0FBQ0osVUFBSSxPQUFPO0FBQ1gsVUFBSSxZQUFZLE9BQU87QUFDdkIsVUFBSSxTQUFTLEtBQUssZ0JBQWdCLEtBQUssUUFBUyxNQUFLLFNBQVMsS0FBSyxVQUFVLE1BQU0sS0FBSyxLQUFLLE9BQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxPQUFPLEtBQUssU0FBUyxLQUFLLEtBQUssUUFBUTtBQUNuSyxVQUFJLE9BQU87QUFBQTtBQUFBLElBR2Y7QUFDSSxVQUFJO0FBQ0osVUFBSSxLQUFLLFNBQVMsU0FBUyxhQUFhO0FBQ3hDLFVBQUksWUFBWSxPQUFPO0FBQ3ZCLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSSxLQUFLLFNBQVMsU0FBUyxhQUFhO0FBQ3hDLFVBQUksY0FBYyxPQUFPO0FBQ3pCLFVBQUk7QUFDSixVQUFJLE9BQU87QUFDWCxVQUFJLFlBQVksT0FBTztBQUN2QixVQUFJLFNBQVMsb0NBQW9DLEtBQUssZUFBZSxVQUFVLElBQUksVUFBVSxJQUFJLGNBQWM7QUFDL0csVUFBSSxTQUFTLE9BQU8sUUFBUSxVQUFVLElBQUksVUFBVSxJQUFJLGNBQWM7QUFDdEUsVUFBSSxPQUFPO0FBQUE7QUFBQSxJQUlmO0FBQ0ksV0FBSyxTQUFTO0FBRWQsV0FBSztBQUFBO0FBQUEsSUFHVDtBQUNJLFdBQUssZUFBZTtBQUNwQixlQUFTO0FBQUE7QUFBQSxJQUdiO0FBQ0ksV0FBSyxZQUFZO0FBQUE7QUFBQSxJQUVyQjtBQUNJLFdBQUssWUFBWTtBQUFBO0FBQUEsSUFHckIsV0FBVztBQUNQLFVBQUksS0FBSztBQUNMLFlBQUssT0FBTyxPQUFPLE9BQU8sT0FBUSxPQUFPO0FBQ3JDLG1CQUFTLFNBQVM7QUFBQSxtQkFDWCxPQUFPO0FBQ2QsbUJBQVMsT0FBTyxNQUFNLEdBQUcsT0FBTyxTQUFTO0FBQUEsbUJBQ2xDLE9BQU87QUFDZCxlQUFLLGVBQWU7QUFDcEIsZUFBSyxTQUFTO0FBQ2QsY0FBSTtBQUNKLGNBQUksS0FBSyxRQUFRLEtBQUs7QUFDbEIscUJBQVMsU0FBUztBQUFBLHFCQUNYLEtBQUssUUFBUSxLQUFLO0FBQ3pCLHFCQUFTLFdBQVc7QUFBQTtBQUV4QixlQUFLLFFBQVE7QUFDYixjQUFJLEtBQUssaUJBQWlCO0FBQ3RCLGtCQUFNLFFBQVEsTUFBTTtBQUFBO0FBQUEsbUJBRWpCLE9BQU87QUFDZCxlQUFLLGVBQWU7QUFDcEIsZUFBSyxTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFPOUIsTUFBTSxTQUFzQjtBQUM1QixNQUFNLFdBQWtCO0FBQ3hCLE1BQU0sU0FBc0I7QUFDNUIsTUFBTSxTQUFzQjtBQUM1QixNQUFJLFNBQWtCO0FBQ3RCLE1BQU0sV0FBc0I7QUFFNUIsTUFBTSxlQUFlLElBQUksVUFBVSxJQUFJLEtBQUssS0FBSyxJQUFJLG1CQUFtQixJQUFJLEtBQUssU0FBUztBQUMxRixNQUFNLGFBQWEsSUFBSSxVQUFVLElBQUksS0FBSyxLQUFLLElBQUksWUFBWSxHQUFHLEtBQUssU0FBUztBQUNoRixNQUFNLGtCQUFrQixJQUFJLFVBQVUsSUFBSSxLQUFLLEtBQUssSUFBSSxtQkFBbUIsR0FBRyxLQUFLLEtBQUs7QUFDeEYsTUFBTSxrQkFBa0IsSUFBSSxVQUFVLElBQUksS0FBSyxLQUFLLElBQUksa0JBQWtCLElBQUksS0FBSyxLQUFLO0FBRXhGLE1BQUksa0JBQWtCO0FBRXRCLE1BQU0sVUFBVTtBQUNoQixNQUFNLFVBQVU7QUFDaEIsTUFBTSxjQUFjO0FBQ3BCLE1BQU0sZUFBZTtBQUVyQixNQUFJO0FBQ0osTUFBSTtBQUNKLE1BQU0sd0JBQXdCO0FBQzlCLE1BQU0sMEJBQTBCO0FBQ2hDLE1BQU0saUJBQWlCLElBQUksVUFBVSxJQUFJLEtBQUssS0FBSyxJQUFJLHNCQUFzQixJQUFJLEtBQUssS0FBSztBQUMzRixNQUFJLGNBQTJCO0FBQy9CLE1BQUksdUJBQXVCO0FBRTNCLE1BQU0sZ0JBQWdCO0FBQ3RCLE1BQU0sZ0JBQWdCO0FBQ3RCLE1BQU0sa0JBQWtCO0FBQ3hCLE1BQU0sa0JBQWtCO0FBQ3hCLE1BQU0seUJBQXlCO0FBQy9CLE1BQU0sMEJBQTBCO0FBRWhDLE1BQU0sYUFBYTtBQUNuQixNQUFNLGNBQWM7QUFDcEIsTUFBTSxjQUFjO0FBQ3BCLE1BQU0sY0FBYztBQUVwQixNQUFNLGFBQWE7QUFDbkIsTUFBTSxTQUFTLFNBQVMsZUFBZTtBQUN2QyxNQUFNLE1BQU0sT0FBTyxXQUFXO0FBQzlCLE1BQUksd0JBQXdCO0FBQzVCLE1BQU0sYUFBYSxPQUFPO0FBQzFCLE1BQU0sWUFBWSxPQUFPO0FBRXpCLE1BQU0sbUJBQW1CLENBQUMsVUFBeUIsT0FBTyxRQUFRLENBQUMsVUFBVSxNQUFNLFdBQVcsTUFBTTtBQUVwRyxTQUFPLGlCQUFpQixTQUFTO0FBQ2pDLFNBQU8saUJBQWlCLGFBQWE7QUFDckMsU0FBTyxpQkFBaUIsV0FBVztBQUVuQyxNQUFNLFdBQVc7QUFDakIsTUFBTSxhQUFhO0FBQ25CLE1BQU0sYUFBYSxXQUFXLE1BQU07QUFDcEMsTUFBSSxPQUFPO0FBRVgsTUFBTSxnQkFBZ0I7QUFDdEIsTUFBTSxrQkFBa0IsZ0JBQWdCLE1BQU07QUFFOUMsTUFBSSxhQUFhO0FBQ2pCLE1BQUksT0FBTztBQUVYLE1BQU0sZUFBZTtBQUNyQixNQUFNLGdCQUFnQixLQUFLLE1BQU0sTUFBTztBQUV4QyxNQUFJLG9CQUFvQjtBQUV4QixNQUFJLFlBQVksQ0FBQyxnQkFBZ0I7QUFDakMsTUFBSSxpQkFBaUIsQ0FBQyxnQkFBZ0I7QUFDdEMsTUFBSSxhQUFhLENBQUMsZ0JBQWdCO0FBRWxDLE1BQUksU0FBUztBQUdiLE1BQUksZUFBZTtBQUNuQixNQUFJO0FBQ0osTUFBSTtBQUVKLE1BQUksVUFBVTtBQUNkLE1BQUk7QUFFSixNQUFNLFNBQVM7QUFBQSxJQUNYLFlBQVk7QUFBQSxJQUNaLFNBQVM7QUFBQSxJQUNULE1BQU87QUFBQSxJQUNQLFdBQVk7QUFBQSxJQUNaLE9BQVE7QUFBQTtBQUdaLE1BQU0sU0FBUztBQUFBLElBQ1gsU0FBUztBQUFBLElBQ1QsTUFBTztBQUFBLElBQ1AsV0FBVztBQUFBO0FBR2YsTUFBTSxTQUFTO0FBQUEsSUFDWCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUE7QUFHWixNQUFNLFFBQVE7QUFBQSxJQUNWLEtBQUs7QUFBQSxJQUNMLE1BQU07QUFBQTtBQUlWLE1BQU0sUUFBUTtBQUFBLElBQ1YsUUFBUTtBQUFBLElBQ1IsU0FBUztBQUFBO0FBaE9iO0FBQUEsSUFrUEksWUFBWSxNQUFjLE1BQWMsV0FBc0I7QUFDMUQsV0FBSyxRQUFRLE9BQU87QUFDcEIsV0FBSyxPQUFPO0FBQ1osV0FBSyxPQUFPO0FBQ1osV0FBSyxZQUFZO0FBQ2pCLFdBQUssV0FBVztBQUNoQixXQUFLLFdBQVc7QUFDaEIsV0FBSyxTQUFTO0FBQ2QsV0FBSyxVQUFVO0FBQ2YsV0FBSyxVQUFVO0FBQ2YsV0FBSyxTQUFTO0FBQ2QsV0FBSyxTQUFTO0FBQ2QsV0FBSyxZQUFZO0FBQ2pCLFdBQUssZUFBZTtBQUFBO0FBQUEsSUFHeEI7QUFDSSxXQUFLO0FBQ0wsY0FBUSxLQUFLO0FBQUEsYUFDSixPQUFPO0FBQ1IsY0FBSSxZQUFZLE9BQU87QUFDdkI7QUFBQSxhQUNDLE9BQU87QUFDUixjQUFJLFlBQVksT0FBTztBQUN2QjtBQUFBLGFBQ0MsT0FBTztBQUNSLGNBQUksWUFBWSxPQUFPO0FBQ3ZCO0FBQUE7QUFFUixVQUFJLFNBQVMsS0FBSyxLQUFLLE1BQU0sS0FBSyxNQUFNLGFBQWEsY0FBYztBQUFBO0FBQUEsSUFJdkU7QUFDSSxVQUFJLEtBQUs7QUFDTCxjQUFNLFNBQVMsS0FBSyxZQUFhLGNBQWEsUUFBUTtBQUN0RCxhQUFLLE9BQU8sS0FBSyxTQUFVLEtBQUksVUFBVSxLQUFLLFVBQVU7QUFDeEQsYUFBSyxPQUFPLEtBQUssU0FBVSxLQUFJLFVBQVUsS0FBSyxVQUFVO0FBRXhELGFBQUs7QUFBQTtBQUdULFVBQUksS0FBSyxhQUFhLGFBQWE7QUFDL0IsYUFBSyxTQUFTO0FBQ2QsYUFBSyxZQUFZO0FBQUE7QUFBQTtBQUFBLElBSXpCO0FBQ0ksVUFBSSxLQUFLLFNBQVMsT0FBTztBQUNyQixhQUFLO0FBQUE7QUFFVCxVQUFJLEtBQUssV0FBVyxnQkFBZ0I7QUFDaEMsYUFBSyxRQUFRLE9BQU87QUFBQTtBQUFBO0FBQUE7QUF2U2hDO0FBQUEsSUFzVEksWUFBWSxNQUFjLE1BQWM7QUFtR3hDLDhCQUFtQixNQUFNLEtBQUssT0FBTyxLQUFLLE1BQU0sS0FBSyxXQUFXLEtBQUs7QUFFckUsdUJBQVksTUFBTSxLQUFLLE9BQU8sT0FBTyxDQUFDLFdBQVcsT0FBTyxTQUFTLE9BQU8sTUFBTTtBQUU5RSw0QkFBaUIsTUFBTSxLQUFLLE9BQU8sT0FBTyxDQUFDLFdBQVcsT0FBTyxTQUFTLE9BQU8sUUFBUSxDQUFDLE9BQU8sVUFBVTtBQUV2Ryw2QkFBa0IsTUFBTSxLQUFLLE9BQU8sT0FBTyxDQUFDLFdBQVcsT0FBTyxTQUFTLE9BQU8sU0FBUztBQUV2Rix5QkFBYyxNQUFNLEtBQUssT0FBTyxPQUFPLENBQUMsV0FBVyxPQUFPLFFBQVE7QUFFbEUsb0JBQVMsTUFBTSxLQUFLLE9BQU8sUUFBUSxDQUFDLFdBQVcsT0FBTztBQTVHbEQsWUFBTSxhQUFhLEtBQUssS0FBSyxLQUFLLEtBQUs7QUFDdkMsV0FBSyxrQkFBa0I7QUFDdkIsV0FBSyxTQUFTO0FBQ2QsV0FBSyxRQUFRO0FBQ2IsV0FBSyxPQUFPO0FBQ1osV0FBSyxPQUFPO0FBQ1osV0FBSyxPQUFPO0FBQ1osV0FBSyxTQUFTLE1BQU0sS0FBSyxDQUFDLFFBQVE7QUFDbEMsZUFBUyxJQUFJLEdBQUcsSUFBSSxNQUFNO0FBQ3RCLGNBQU0sV0FBVyxzQkFBc0IsTUFBTTtBQUM3QyxhQUFLLE9BQU8sS0FBSyxJQUFJLE9BQU8sU0FBUyxJQUFJLFNBQVMsSUFBSSxNQUFNO0FBQUE7QUFBQTtBQUFBLElBS3BFO0FBQ0ksZUFBUyxJQUFJLEdBQUcsSUFBSSxLQUFLLE1BQU07QUFDM0IsYUFBSyxPQUFPLEdBQUc7QUFBQTtBQUduQixZQUFNLFFBQVEsS0FBSyxPQUFPO0FBQzFCLFlBQU0sU0FBUyxLQUFLLE9BQVEsTUFBSyxRQUFRLEtBQUs7QUFDOUMsWUFBTSxPQUFPLEtBQUssT0FBTyxJQUFJO0FBQzdCLFlBQU0sT0FBTyxLQUFLLE9BQVEsS0FBSyxTQUFVO0FBRXpDLFVBQUk7QUFDSixVQUFJLE9BQU8sT0FBTztBQUNsQixVQUFJLE9BQU8sUUFBUTtBQUNuQixVQUFJLE9BQU8sUUFBUTtBQUNuQixVQUFJLE9BQU8sT0FBTztBQUNsQixVQUFJLE9BQU8sT0FBTztBQUNsQixVQUFJLGNBQWMsT0FBTztBQUN6QixVQUFJO0FBQUE7QUFBQSxJQUdSO0FBQ0ksWUFBTSxXQUFXO0FBQ2pCLGVBQVMsSUFBSSxHQUFHLElBQUksS0FBSyxNQUFNO0FBQzNCLFlBQUksS0FBSyxPQUFPLEdBQUcsU0FBUyxPQUFPO0FBQy9CLGVBQUssYUFBYSxLQUFLLFNBQVMsSUFBSTtBQUNwQyxlQUFLLGFBQWEsS0FBSyxTQUFTLElBQUk7QUFDcEMsZUFBSyxhQUFhLEtBQUssUUFBUSxJQUFJO0FBQ25DLGVBQUssYUFBYSxLQUFLLFFBQVEsSUFBSTtBQUFBO0FBQUE7QUFLM0MsZUFBUyxJQUFJLEdBQUcsTUFBTSxTQUFTLFFBQVEsSUFBSSxLQUFLO0FBQzVDLGNBQU0sU0FBUyxTQUFTO0FBQ3hCLGFBQUssT0FBTyxRQUFRLFFBQVEsT0FBTztBQUFBO0FBQUE7QUFBQSxJQUkzQyxTQUFTO0FBQ0wsWUFBTSxRQUFRLFNBQVMsS0FBSztBQUM1QixVQUFJLFFBQVE7QUFDUixlQUFPO0FBQUE7QUFFWCxhQUFPLFNBQVMsS0FBSztBQUFBO0FBQUEsSUFHekIsU0FBUztBQUNMLFlBQU0sUUFBUSxTQUFTLEtBQUs7QUFDNUIsVUFBSSxRQUFTLEtBQUssT0FBTztBQUNyQixlQUFPO0FBQUE7QUFFWCxhQUFPO0FBQUE7QUFBQSxJQUdYLFFBQVE7QUFDSixZQUFNLE1BQU0sU0FBUyxLQUFLO0FBQzFCLFVBQUksT0FBTyxLQUFLLFFBQVE7QUFDcEIsZUFBTztBQUFBO0FBRVgsYUFBTyxTQUFTO0FBQUE7QUFBQSxJQUdwQixRQUFRO0FBQ0osWUFBTSxNQUFNLFNBQVMsS0FBSztBQUMxQixVQUFJLE9BQU87QUFDUCxlQUFPO0FBQUE7QUFFWCxhQUFPLFNBQVM7QUFBQTtBQUFBLElBR3BCLGFBQWEsUUFBZ0I7QUFFekIsVUFBSSxVQUFVO0FBQ1Y7QUFBQTtBQUdKLFlBQU0sZUFBZSxLQUFLLE9BQU8sUUFBUTtBQUN6QyxZQUFNLE9BQU8sS0FBSztBQUNsQixVQUFJLFFBQVEsYUFBYSxRQUFRLE9BQU8sZ0JBQWdCLE9BQU87QUFDM0QsaUJBQVMsS0FBSztBQUFBO0FBQUE7QUFBQTtBQXJaMUI7QUFBQSxJQWdiSSxZQUFZLFlBQW1CLE1BQWMsTUFBYyxTQUFpQixRQUFnQjtBQUN4RixXQUFLLE9BQU87QUFDWixXQUFLLE9BQU87QUFDWixXQUFLLE9BQU87QUFDWixXQUFLLFVBQVU7QUFDZixXQUFLLFNBQVM7QUFDZCxXQUFLLE9BQU87QUFDWixXQUFLLGlCQUFpQjtBQUFBO0FBQUEsSUFHMUI7QUFFSSxZQUFNLFFBQVEsS0FBSyxPQUFPLEtBQUs7QUFFL0IsVUFBSTtBQUNKLFVBQUksT0FBTyxLQUFLLE1BQU0sS0FBSztBQUMzQixVQUFJLE9BQU8sS0FBSyxNQUFNO0FBQ3RCLFVBQUksT0FBTyxLQUFLLE9BQU8sS0FBSyxRQUFRO0FBQ3BDLFVBQUksY0FBYyxPQUFPO0FBQ3pCLFVBQUk7QUFBQTtBQUFBLElBR1I7QUFDSSxVQUFJLE9BQU87QUFDWCxVQUFJLFlBQVksT0FBTztBQUN2QixVQUFJLFNBQVMsS0FBSyxNQUFNLEtBQUssTUFBTSxLQUFLLE9BQU8sSUFBSSxLQUFLO0FBQ3hELFVBQUksT0FBTztBQUFBO0FBQUEsSUFHZjtBQUNJLFlBQU0sUUFBUSxLQUFLLE9BQU8sS0FBSztBQUMvQixVQUFJLFlBQVksT0FBTztBQUN2QixVQUFJLE9BQU87QUFDWCxZQUFNLFNBQVMsS0FBSyxJQUFJLEdBQUcsS0FBSztBQUNoQyxVQUFJLFNBQVMsS0FBSztBQUNkLGNBQU0sUUFBUSxLQUFLLGtCQUFrQixLQUFLO0FBQzFDLGlCQUFTLElBQUksR0FBRyxNQUFNLE1BQU0sUUFBUSxJQUFJLEtBQUs7QUFDekMsY0FBSSxTQUFTLEdBQUcsTUFBTSxNQUFNLEtBQUssT0FBTyxJQUFJLFlBQVksUUFBUSxNQUFNLEtBQUssY0FBYztBQUN6RixjQUFJO0FBQ0osY0FBSSxPQUFPLEtBQUssTUFBTSxRQUFRLE1BQU07QUFDcEMsY0FBSSxPQUFPLEtBQUssT0FBTyxHQUFHLFFBQVEsTUFBTTtBQUN4QyxjQUFJO0FBQUE7QUFBQTtBQUdSLGNBQU0sUUFBUSxLQUFLLGtCQUFrQjtBQUNyQyxpQkFBUyxJQUFJLEdBQUcsTUFBTSxNQUFNLFFBQVEsSUFBSSxLQUFLO0FBQ3pDLGdCQUFNLFVBQVUsTUFBTyxNQUFNLFNBQVM7QUFDdEMsY0FBSSxTQUFTLEdBQUcsTUFBTSxNQUFNLEtBQUssT0FBTyxJQUFJLFlBQVksUUFBUyxNQUFNLEtBQUssVUFBVyxLQUFLLFVBQVUsY0FBYztBQUNwSCxjQUFJO0FBQ0osY0FBSSxPQUFPLEtBQUssTUFBTSxRQUFTLE1BQU0sS0FBSyxVQUFXLEtBQUs7QUFDMUQsY0FBSSxPQUFPLEtBQUssT0FBTyxHQUFHLFFBQVMsTUFBTSxLQUFLLFVBQVcsS0FBSztBQUM5RCxjQUFJO0FBQUE7QUFBQTtBQUdaLFVBQUksT0FBTztBQUFBO0FBQUEsSUFHZjtBQUNJLFlBQU0sUUFBUSxLQUFLLE9BQU8sS0FBSztBQUMvQixVQUFJLFlBQVksT0FBTztBQUN2QixVQUFJLE9BQU87QUFFWCxVQUFJLFVBQVUsS0FBSztBQUNuQixZQUFNLGFBQWEsVUFBVSxLQUFLLEtBQUs7QUFDdkMsVUFBSSxhQUFhLEtBQUs7QUFDbEIsa0JBQVUsS0FBSyxTQUFTLEtBQUssS0FBSztBQUFBO0FBR3RDLFlBQU0sY0FBYyxLQUFLLFNBQVM7QUFFbEMsWUFBTSxRQUFRLEtBQUssa0JBQWtCO0FBRXJDLFVBQUk7QUFDSixXQUFLLElBQUksR0FBRyxJQUFJLE1BQU0sUUFBUTtBQUMxQixZQUFJLFNBQVMsR0FBRyxNQUFNLE1BQU0sS0FBSyxPQUFPLE1BQU0sS0FBSyxTQUFTLFFBQVE7QUFBQTtBQUd4RSxVQUFJLE9BQU87QUFBQTtBQUFBLElBR2Ysa0JBQWtCO0FBRWQsVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJLElBQUk7QUFDUixhQUFPO0FBRUgsWUFBSSxNQUFNO0FBQ1YsbUJBQVcsS0FBSyxLQUFLLE9BQU87QUFDNUIsWUFBSSxZQUFZLEtBQUssWUFBWTtBQUM3QjtBQUFBO0FBRUosWUFBSSxJQUFJLE1BQU07QUFDZCxtQkFBVyxLQUFLLEtBQUssT0FBTztBQUM1QixZQUFJLFlBQVksS0FBSyxZQUFZO0FBQzdCO0FBQUE7QUFFSixZQUFJLElBQUksTUFBTTtBQUNkLG1CQUFXLEtBQUssS0FBSyxPQUFPO0FBQzVCLFlBQUksWUFBWSxLQUFLLFlBQVk7QUFDN0I7QUFBQTtBQUdKO0FBQUE7QUFHSixZQUFNLFFBQVE7QUFFZCxVQUFJO0FBQ0osV0FBSyxJQUFJLEdBQUcsS0FBSyxVQUFVO0FBQ3ZCLGNBQU0sS0FBSyxJQUFJO0FBQUE7QUFHbkIsYUFBTztBQUFBO0FBQUEsSUFHWDtBQUVJLFVBQUk7QUFDSixVQUFJLFVBQVUsS0FBSztBQUNuQixZQUFNLFFBQVEsS0FBSyxPQUFPLEtBQUs7QUFFL0IsWUFBTSxhQUFhLFVBQVUsS0FBSyxLQUFLO0FBQ3ZDLFVBQUksYUFBYSxLQUFLO0FBQ2xCLGtCQUFVLEtBQUssU0FBUyxLQUFLLEtBQUs7QUFBQTtBQUV0QyxZQUFNLFNBQVMsS0FBSyxJQUFJLEdBQUcsS0FBSztBQUVoQyxVQUFJLFlBQVksT0FBTztBQUV2QixVQUFJLFNBQVMsS0FBSztBQUNkLGFBQUssSUFBSSxHQUFHLElBQUksS0FBSyxLQUFLLFFBQVE7QUFDOUIsZ0JBQU0sVUFBVSxRQUFRLEtBQUssS0FBSztBQUNsQyxnQkFBTSxPQUFPLEtBQUssT0FBTyxJQUFJO0FBQzdCLGNBQUk7QUFDSixjQUFJLEtBQUssTUFBTSxTQUFTLFNBQVMsS0FBSyxLQUFLO0FBQzNDLGNBQUk7QUFBQTtBQUFBO0FBSVIsYUFBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLEtBQUssUUFBUTtBQUM5QixnQkFBTSxhQUFjLEtBQUssS0FBSyxLQUFLLFNBQVUsS0FBSztBQUNsRCxnQkFBTSxVQUFVLFFBQVE7QUFDeEIsZ0JBQU0sT0FBTyxLQUFLLE9BQU8sSUFBSTtBQUM3QixjQUFJO0FBQ0osY0FBSSxLQUFLLE1BQU0sU0FBUyxTQUFTO0FBQ2pDLGNBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQU1oQjtBQUNJLFdBQUs7QUFDTCxXQUFLO0FBQ0wsV0FBSztBQUNMLFdBQUs7QUFDTCxXQUFLO0FBQUE7QUFBQTtBQTdrQmI7QUFBQSxJQThsQkksWUFBWSxNQUFjLE1BQWMsT0FBZSxRQUFnQixPQUFlLE9BQXdCLFNBQWtCLFNBQWtCO0FBQzlJLFdBQUssT0FBTztBQUNaLFdBQUssT0FBTztBQUNaLFdBQUssUUFBUTtBQUNiLFdBQUssU0FBUztBQUNkLFdBQUssUUFBUTtBQUNiLFdBQUssUUFBUTtBQUNiLFdBQUssVUFBVTtBQUNmLFdBQUssU0FBUztBQUNkLFdBQUssUUFBUTtBQUNiLFdBQUssWUFBWTtBQUNqQixlQUFTLEtBQUs7QUFDZCxVQUFJLFdBQVc7QUFDWCxhQUFLLFNBQVM7QUFBQTtBQUFBO0FBQUEsSUFLdEI7QUFDSSxXQUFLLFFBQVEsT0FBTyxLQUFLO0FBQ3pCLFdBQUssU0FBUztBQUNkLFdBQUssWUFBWTtBQUFBO0FBQUEsSUFHckI7QUFDSSxVQUFJO0FBQ0osVUFBSTtBQUVKLFVBQUksS0FBSztBQUNMLFlBQUksS0FBSyxVQUFVLFFBQVEsS0FBSyxZQUFhLGdCQUFlLEtBQUs7QUFDN0QsaUJBQU8sT0FBTztBQUNkLGlCQUFPLE9BQU87QUFBQTtBQUVkLGlCQUFPLE9BQU87QUFDZCxpQkFBTyxPQUFPO0FBQUE7QUFBQTtBQUdsQixZQUFJLEtBQUssVUFBVTtBQUNmLGlCQUFPLE9BQU87QUFDZCxpQkFBTyxPQUFPO0FBQUE7QUFFZCxpQkFBTyxPQUFPO0FBQ2QsaUJBQU8sT0FBTztBQUFBO0FBQUE7QUFHdEIsVUFBSTtBQUNKLFVBQUksS0FBSyxLQUFLLE1BQU0sS0FBSyxNQUFNLEtBQUssT0FBTyxLQUFLO0FBQ2hELFVBQUksWUFBWTtBQUNoQixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUksS0FBSyxLQUFLLE1BQU0sS0FBSyxNQUFNLEtBQUssT0FBTyxLQUFLO0FBQ2hELFVBQUksY0FBYyxPQUFPO0FBQ3pCLFVBQUk7QUFDSixVQUFJLE9BQU87QUFDWCxVQUFJLFlBQVk7QUFDaEIsVUFBSSxTQUFTLEtBQUssT0FBTyxLQUFLLE9BQU8sR0FBRyxLQUFLLE9BQU8sSUFBSSxLQUFLLFFBQVE7QUFDckUsVUFBSSxPQUFPO0FBRVgsV0FBSyxZQUFZLEtBQUssWUFBWTtBQUFBO0FBQUE7QUF4cEIxQztBQUFBLElBc3FCSSxZQUFZLE1BQWMsTUFBYyxPQUFlLFFBQWdCO0FBd0N2RSxvQkFBUyxDQUFDLFVBQTJCLEtBQUssY0FBYztBQXZDcEQsV0FBSyxPQUFPO0FBQ1osV0FBSyxPQUFPO0FBQ1osV0FBSyxRQUFRO0FBQ2IsV0FBSyxTQUFTO0FBQ2QsV0FBSyxRQUFRO0FBQ2IsV0FBSyxVQUFVO0FBQ2YsZUFBUyxLQUFLO0FBRWQsV0FBSyxjQUFjO0FBRW5CLFdBQUssUUFBUTtBQUFBO0FBQUEsSUFHakIsVUFBVSxNQUFjLE1BQWMsT0FBZSxRQUFnQixPQUFlLE9BQXdCLFNBQWtCO0FBQzFILFlBQU0sWUFBWSxJQUFJLE9BQU8sTUFBTSxNQUFNLE9BQU8sUUFBUSxPQUFPLE9BQU8sTUFBTSxTQUFTO0FBQ3JGLFdBQUssUUFBUSxLQUFLO0FBQ2xCLFVBQUksV0FBVztBQUNYLGFBQUssUUFBUTtBQUNiLGFBQUssY0FBYztBQUFBO0FBRXZCLGFBQU87QUFBQTtBQUFBLElBR1g7QUFDSSxVQUFJO0FBQ0osVUFBSSxLQUFLLEtBQUssTUFBTSxLQUFLLE9BQU8sS0FBSyxRQUFRLEtBQUssT0FBTyxLQUFLO0FBQzlELFVBQUksY0FBYyxPQUFPO0FBQ3pCLFVBQUk7QUFDSixVQUFJLE9BQU87QUFDWCxVQUFJLFlBQVksT0FBTztBQUN2QixVQUFJLFNBQVMsS0FBSyxPQUFPLEtBQUssT0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLE9BQU8sS0FBSyxTQUFTLEtBQUssS0FBSyxRQUFRO0FBQ3BHLFVBQUksT0FBTztBQUVYLFVBQUk7QUFDSixXQUFLLElBQUksR0FBRyxJQUFJLEtBQUssUUFBUSxRQUFRO0FBQ2pDLGFBQUssUUFBUSxHQUFHO0FBQUE7QUFBQTtBQUFBLElBTXhCO0FBQ0ksV0FBSyxRQUFRLEtBQUs7QUFFbEIsVUFBSTtBQUNKLFdBQUssSUFBSSxHQUFHLElBQUksS0FBSyxRQUFRLFFBQVE7QUFDakMsWUFBSSxLQUFLLFNBQVMsS0FBSyxRQUFRLEdBQUc7QUFDOUIsZUFBSyxRQUFRLEdBQUcsU0FBUztBQUFBO0FBRXpCLGVBQUssUUFBUSxHQUFHLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVF6QztBQUVJO0FBRUE7QUFFQTtBQUVBLFFBQUksV0FBVztBQUNYLGdCQUFVO0FBQ1Y7QUFBQTtBQUFBO0FBS1I7QUFFSSxhQUFTO0FBRVQsc0JBQWtCO0FBQ2xCLGtCQUFjO0FBQ2QsaUJBQWE7QUFDYixXQUFPO0FBRVAsZ0JBQVksQ0FBQyxnQkFBZ0I7QUFDN0IscUJBQWlCLENBQUMsZ0JBQWdCO0FBQ2xDLGlCQUFhLENBQUMsZ0JBQWdCO0FBRTlCLGFBQVM7QUFFVDtBQUFBO0FBR0o7QUFFSSxRQUFJLE1BQU0sU0FBUyxNQUFNO0FBQ3JCLHlCQUFtQixhQUFhLEdBQUc7QUFDbkM7QUFBQTtBQUdKLFFBQUksYUFBYSxhQUFhLFNBQVM7QUFDbkM7QUFBQTtBQUdKO0FBRUEsUUFBSSxlQUFlO0FBQ2YsYUFBTztBQUFBO0FBR1gsUUFBSTtBQUNKLFNBQUssSUFBSSxHQUFHLElBQUksT0FBTyxRQUFRO0FBQzNCLFVBQUksT0FBTyxHQUFHLGdCQUFnQjtBQUMxQixlQUFPLEdBQUc7QUFDVjtBQUNBO0FBQUE7QUFBQTtBQU1SLFFBQUksYUFBYSxhQUFhLFNBQVM7QUFFbkMsVUFBSTtBQUVKLFdBQUssS0FBSSxHQUFHLEtBQUksU0FBUyxRQUFRO0FBQzdCLGlCQUFTLElBQUc7QUFBQTtBQUdoQixVQUFJLFFBQVEsU0FBUyxNQUFNO0FBQ3ZCO0FBQ0E7QUFBQTtBQUdKLFVBQUksQ0FBQztBQUNELGFBQUssS0FBSSxHQUFHLEtBQUksWUFBWSxRQUFRO0FBQ2hDLHNCQUFZLElBQUc7QUFDZixzQkFBWSxJQUFHO0FBQUE7QUFHbkI7QUFFQTtBQUVBO0FBQUE7QUFBQTtBQUlSO0FBRUE7QUFBQTtBQUdKO0FBQ0ksZUFBVyxnQkFBZ0I7QUFBQTtBQUcvQixNQUFNLGFBQWEsTUFBTSxPQUFPLFFBQVEsQ0FBQyxVQUFVLE1BQU07QUFDekQsTUFBTSxhQUFhLE1BQU0sT0FBTyxRQUFRLENBQUMsVUFBVSxNQUFNO0FBQ3pELE1BQU0sZUFBZSxNQUFNLFNBQVMsUUFBUSxDQUFDLFlBQVksUUFBUTtBQUVqRTtBQUNJLGNBQVUsS0FBSztBQUNmLG1CQUFlLEtBQUs7QUFDcEIsZUFBVyxLQUFLO0FBQUE7QUFHcEI7QUFDSSxVQUFNLGlCQUFpQixLQUFLLEtBQUssS0FBSyxLQUFLLGVBQWU7QUFDMUQsdUJBQW1CO0FBQ25CLG9CQUFnQixLQUFLLEtBQUssZUFBZSxRQUFRO0FBQUE7QUFHckQsOEJBQTRCO0FBQ3hCLFVBQU0sSUFBSSxNQUFNLFFBQVE7QUFDeEIsVUFBTSxJQUFJLE1BQU0sUUFBUTtBQUN4QixhQUFTLElBQUksR0FBRyxNQUFNLFNBQVMsUUFBUSxJQUFJLEtBQUs7QUFDNUMsWUFBTSxPQUFPLFNBQVMsR0FBRztBQUN6QixZQUFNLFFBQVEsU0FBUyxHQUFHLE9BQU8sU0FBUyxHQUFHO0FBQzdDLFlBQU0sTUFBTSxTQUFTLEdBQUc7QUFDeEIsWUFBTSxTQUFTLFNBQVMsR0FBRyxPQUFPLFNBQVMsR0FBRztBQUM5QyxVQUFJLEtBQUssUUFBUSxLQUFLLFNBQVMsS0FBSyxPQUFPLEtBQUs7QUFDNUMsaUJBQVMsR0FBRztBQUFBO0FBQUE7QUFBQTtBQUt4QixrQ0FBZ0M7QUFDNUIsVUFBTSxJQUFJLE1BQU0sUUFBUTtBQUN4QixVQUFNLElBQUksTUFBTSxRQUFRO0FBQ3hCLGFBQVMsSUFBSSxHQUFHLE1BQU0sT0FBTyxRQUFRLElBQUksS0FBSztBQUMxQyxZQUFNLE9BQU8sT0FBTyxHQUFHO0FBQ3ZCLFlBQU0sUUFBUSxPQUFPLEdBQUcsT0FBTyxPQUFPLEdBQUc7QUFDekMsWUFBTSxNQUFNLE9BQU8sR0FBRztBQUN0QixZQUFNLFNBQVMsT0FBTyxHQUFHLE9BQU8sT0FBTyxHQUFHO0FBQzFDLFVBQUksS0FBSyxRQUFRLEtBQUssU0FBUyxLQUFLLE9BQU8sS0FBSztBQUM1QyxlQUFPLEdBQUc7QUFBQTtBQUVWLGVBQU8sR0FBRztBQUFBO0FBQUE7QUFBQTtBQUt0QixNQUFNLFlBQVksTUFBTSxZQUFZLElBQUksQ0FBQyxjQUFjLFVBQVUsYUFBYSxPQUFPLENBQUMsR0FBRyxNQUFNLElBQUk7QUFFbkcsTUFBTSxpQkFBaUIsTUFBTSxZQUFZLElBQUksQ0FBQyxjQUFjLFVBQVUsa0JBQWtCLE9BQU8sQ0FBQyxHQUFHLE1BQU0sSUFBSTtBQUU3RyxNQUFNLGtCQUFrQixNQUFNLFlBQVksSUFBSSxDQUFDLGNBQWMsVUFBVSxtQkFBbUIsT0FBTyxDQUFDLEdBQUcsTUFBTSxJQUFJO0FBRS9HO0FBQ0ksYUFBUyxJQUFJLEdBQUcsTUFBTSxZQUFZLFFBQVEsSUFBSSxLQUFLO0FBQy9DLGVBQVMsSUFBSSxHQUFHLE9BQU8sWUFBWSxHQUFHLE9BQU8sUUFBUSxJQUFJLE1BQU07QUFDM0QsY0FBTSxTQUFTLFlBQVksR0FBRyxPQUFPO0FBQ3JDLGNBQU0sUUFBUSxzQkFBc0IsT0FBTyxXQUFXLE9BQU87QUFDN0QsZUFBTyxPQUFPLE1BQU07QUFDcEIsZUFBTyxPQUFPLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFNaEMsaUNBQStCLFdBQXNCO0FBQ2pELFVBQU0sTUFBTSxLQUFLLE1BQU0sU0FBUyxVQUFVO0FBQzFDLFVBQU0sTUFBTSxTQUFTLFVBQVU7QUFDL0IsVUFBTSxJQUFJLFVBQVUsT0FBTyxNQUFNLGFBQWE7QUFDOUMsVUFBTSxJQUFJLFVBQVUsT0FBTyxNQUFNLGNBQWM7QUFDL0MsV0FBTyxDQUFDLEdBQUc7QUFBQTtBQUlmO0FBRUksVUFBTSxlQUFlO0FBQ3JCLFVBQU0sV0FBVyxlQUFlO0FBRWhDLGFBQVMsSUFBSSxHQUFHLElBQUksVUFBVTtBQUMxQixZQUFNLFVBQVU7QUFDaEIsY0FBUSxTQUFTO0FBQ2pCLGNBQVEsWUFBWTtBQUNwQixVQUFJLFVBQVU7QUFDZCxhQUFPLFFBQVEsYUFBYSxRQUFRO0FBQ2hDLGtCQUFVO0FBQUE7QUFFZCxjQUFRLFNBQVM7QUFDakIsY0FBUSxZQUFZO0FBRXBCLFlBQU0sU0FBUyxzQkFBc0IsUUFBUSxXQUFXLFFBQVE7QUFDaEUsWUFBTSxTQUFTLHNCQUFzQixRQUFRLFdBQVcsUUFBUTtBQUVoRSxjQUFRLFNBQVMsT0FBTztBQUN4QixjQUFRLFNBQVMsT0FBTztBQUN4QixjQUFRLFNBQVMsT0FBTztBQUN4QixjQUFRLFNBQVMsT0FBTztBQUV4QixZQUFNLGVBQWUsc0JBQXNCLFFBQVEsV0FBVyxRQUFRO0FBQ3RFLFlBQU0sZUFBZSxzQkFBc0IsUUFBUSxXQUFXLFFBQVE7QUFFdEUsY0FBUSxVQUFVLGFBQWE7QUFDL0IsY0FBUSxVQUFVLGFBQWE7QUFDL0IsY0FBUSxVQUFVLGFBQWE7QUFDL0IsY0FBUSxVQUFVLGFBQWE7QUFFL0IsWUFBTSxRQUFRLFFBQVE7QUFDdEIsWUFBTSxRQUFRLFFBQVE7QUFDdEIsWUFBTSxTQUFTLFFBQVE7QUFDdkIsWUFBTSxTQUFTLFFBQVE7QUFFdkIsWUFBTSxPQUFPLFVBQVU7QUFDdkIsWUFBTSxPQUFPLFVBQVU7QUFFdkIsWUFBTSxXQUFXLFFBQVE7QUFDekIsWUFBTSxVQUFVLFFBQVE7QUFDeEIsY0FBUSxZQUFZLFFBQVE7QUFDNUIsY0FBUSxXQUFXLFFBQVE7QUFDM0IsY0FBUSxZQUFZO0FBQ3BCLGNBQVEsV0FBVztBQUFBO0FBQUE7QUFNM0IsTUFBSTtBQUVKLE1BQU0sV0FBVyxNQUFNLFFBQVEsc0JBQXNCO0FBRXJEO0FBQ0k7QUFDQSxXQUFPLE1BQU07QUFDVDtBQUFBO0FBRUosV0FBTztBQUFBO0FBR1g7QUFDSSxVQUFNLGNBQWM7QUFDcEIsUUFBSSxrQkFBa0I7QUFDdEIsYUFBUyxJQUFJLEdBQUcsSUFBSSxhQUFhO0FBQzdCLFVBQUksS0FBSyxZQUFZLFdBQVcsUUFBUTtBQUNwQztBQUFBO0FBQUE7QUFHUixzQkFBa0IsS0FBSztBQUV2QixXQUFPO0FBQUE7QUFHWCxNQUFNLHFCQUFxQixNQUFNLFlBQVksSUFBSSxDQUFDLGNBQWMsVUFBVSxNQUFNLE9BQU8sQ0FBQyxHQUFHLE1BQU0sSUFBSTtBQUVyRyxNQUFNLHNCQUFzQixNQUFNLFlBQVksS0FBSyxNQUFNLEtBQUssV0FBVyxlQUFlO0FBRXhGO0FBQ0ksVUFBTSxhQUFhLElBQUksa0JBQWtCLGdCQUFnQjtBQUN6RCxVQUFNLGNBQWMsSUFBSSxrQkFBa0IsZ0JBQWdCO0FBQzFELFVBQU0sa0JBQWtCLHlCQUF5QjtBQUNqRCxVQUFNLGtCQUFrQiwwQkFBMEI7QUFDbEQsV0FBTyxLQUFLLElBQUksaUJBQWlCO0FBQUE7QUFHckM7QUFDSTtBQUNBLFFBQUksWUFBWSxPQUFPO0FBQ3ZCLFFBQUksU0FBUyxHQUFHLG1CQUFtQixJQUFJO0FBRXZDO0FBQ0E7QUFDQTtBQUVBLFVBQU0sY0FBYztBQUNwQixVQUFNLFlBQVk7QUFDbEIsVUFBTSxVQUFVLElBQUk7QUFFcEIsUUFBSSxNQUFNLFdBQVc7QUFDckIsYUFBUyxJQUFJLEdBQUcsSUFBSSxlQUFlLE9BQU87QUFDdEMsa0JBQVksR0FBRztBQUFBO0FBRW5CLFFBQUksTUFBTSxTQUFTO0FBQUE7QUFJdkIsTUFBTSxRQUFRLE1BQU0sSUFBSSxVQUFVLEdBQUcsR0FBRyxPQUFPLE9BQU8sT0FBTztBQUU3RDtBQUNJLGtCQUFjLE1BQU0sS0FBSyxDQUFDLFFBQVEsZUFBZTtBQUVqRCxhQUFTLElBQUksR0FBRyxNQUFNLGVBQWUsT0FBTyxJQUFJLEtBQUs7QUFDakQsWUFBTSxNQUFNLEtBQUssTUFBTSxJQUFJO0FBQzNCLFlBQU0sTUFBTSxJQUFJO0FBRWhCLFlBQU0sT0FBTyxrQkFBa0IsZ0JBQWdCO0FBQy9DLFlBQU0sT0FBTyxrQkFBa0IsZ0JBQWdCO0FBRS9DLGtCQUFZLEtBQUssSUFBSSxVQUFVLHdCQUF3Qix5QkFBeUIsTUFBTTtBQUFBO0FBRzFGLFdBQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxLQUFLLElBQUksS0FBSyxLQUFLLGlCQUFpQixJQUFJLE1BQU0sZ0JBQWdCLEtBQUssS0FBSyxJQUFJLEtBQUssMEJBQTBCLElBQUksTUFBTSxZQUFZLEtBQUssS0FBSyxLQUFLLEtBQUs7QUFFdEwsUUFBSSxDQUFDO0FBQ0QscUJBQWUsSUFBSSxRQUFRLEtBQUssS0FBSyxLQUFLLElBQUk7QUFDOUMsbUJBQWEsVUFBVSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssT0FBTyxRQUFRLE9BQU87QUFDcEUsbUJBQWEsVUFBVSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssT0FBTyxRQUFRLE9BQU87QUFDcEUsbUJBQWEsVUFBVSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssT0FBTyxRQUFRLE1BQU07QUFDbkUsbUJBQWEsVUFBVSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssT0FBTyxRQUFRLE9BQU87QUFDcEUsbUJBQWEsVUFBVSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssT0FBTyxRQUFRLE9BQU87QUFFcEUsZ0JBQVUsSUFBSSxRQUFRLEtBQUssS0FBSyxLQUFLLElBQUk7QUFDekMsY0FBUSxVQUFVLEtBQUssS0FBSyxJQUFJLElBQUksU0FBUyxNQUFNLEtBQUssT0FBTztBQUMvRCxjQUFRLFVBQVUsS0FBSyxLQUFLLElBQUksSUFBSSxRQUFRLE1BQU0sTUFBTSxNQUFNO0FBRTlELGNBQVEsSUFBSSxRQUFRLEtBQUssS0FBSyxLQUFLLElBQUk7QUFDdkMsMkJBQXFCLE1BQU0sVUFBVSxNQUFNLE1BQU0sR0FBRyxHQUFHLFVBQVUsTUFBTSxRQUFRLE1BQU07QUFDckYsWUFBTSxVQUFVLEtBQUssS0FBSyxJQUFJLElBQUksU0FBUyxNQUFNLFNBQVMsT0FBTztBQUFBO0FBQUE7QUFLekU7QUFDSSxRQUFJLGFBQWE7QUFDakIsV0FBTyxhQUFhLGdCQUFnQjtBQUNoQyxZQUFNLGdCQUFnQixLQUFLLE1BQU0sS0FBSyxXQUFXLGVBQWU7QUFDaEUsWUFBTSxnQkFBZ0IsWUFBWTtBQUNsQyxZQUFNLFdBQVcsY0FBYztBQUMvQixZQUFNLFNBQVMsS0FBSyxNQUFNLEtBQUssV0FBVztBQUMxQyxZQUFNLGVBQWUsY0FBYyxPQUFPLFFBQVE7QUFDbEQsVUFBSSxnQkFBZ0IsT0FBTztBQUN2QjtBQUNBLHNCQUFjLE9BQU8sUUFBUSxRQUFRLE9BQU87QUFBQTtBQUFBO0FBQUE7QUFNeEQ7IiwKICAibmFtZXMiOiBbXQp9Cg==

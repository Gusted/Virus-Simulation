// @ts-check
const type = {
    INT: 'integer',
    PERCENT: 'percent'
};

class GameValue {
    xPos;
    yPos;
    width;
    height;
    name;
    displayString;
    value;
    type;
    mouseOver;
    promptModify;
    active;
    resetOnChange;

    /**
     * @param {number} xPos
     * @param {number} yPos
     * @param {number} width
     * @param {number} height
     * @param {string} name
     * @param {number} initialValue
     * @param {string} type
     * @param {boolean} reset
     */
    constructor(xPos, yPos, width, height, name, initialValue, type, reset) {
        this.xPos = xPos;
        this.yPos = yPos;
        this.width = width;
        this.height = height;
        this.name = name;
        this.displayString = name + ': ';
        this.value = initialValue;
        this.type = type;
        this.mouseOver = false;
        this.promptModify = false;
        this.active = false;
        this.resetOnChange = reset;
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
        ctx.fillText(this.displayString + this.value + (this.type === type.PERCENT ? '%' : ''), this.xPos + this.width * 0.05, this.yPos + this.height * 0.8, this.width * 0.9);
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
        ctx.fillText('Voer een nieuwe waarde in voor ' + this.displayString, promptX + 10, promptY + 15, promptWidth * 0.95);
        ctx.fillText('> ' + buffer, promptX + 10, promptY + 30, promptWidth * 0.95);
        ctx.font = fontString;

    }

    modify() {
        this.active = true;

        this.drawPromptBox();
    }

    clickHandler() {
        this.promptModify = true;
        buffer = '';
    }

    hoverHandler() {
        this.mouseOver = true;
    }
    mouseOutHandler() {
        this.mouseOver = false;
    }

    /**
     * @param {string} key
     */
    keyHandler(key) {
        if (this.active) {
            if ((key >= '0' && key <= '9') || key == '.') {
                buffer = buffer + key;
            } else if (key == 'Backspace') {
                buffer = buffer.slice(0, buffer.length - 1);
            } else if (key == 'Enter') {
                this.promptModify = false;
                this.active = false;
                let result;
                let changed = false;
                if (this.type == type.INT) {
                    result = parseInt(buffer);
                } else if (this.type == type.PERCENT) {
                    result = parseFloat(buffer);
                }

                if (result) {
                    this.value = result;
                    changed = true;
                }
                if (changed && this.resetOnChange == true) {
                    reset.value = flags.RESTART;
                }
            } else if (key == 'Escape') {
                this.promptModify = false;
                this.active = false;
            }
        }
    }

}

/** @type GameValue[] */
const values = [];
const clickers = [];
/** @type GameValue[] */
const keyers = [];
/** @type GameValue[] */
const hovers = [];
/** @type Graph[] */
let graphs = [];
/** @type Cluster[] */
const clusters = [];

const transmitProb = new GameValue(15, 300, 160, 15, 'Transmissiekans', 10, type.PERCENT, false);
const travelProb = new GameValue(15, 315, 160, 15, 'Reiskans', 5, type.PERCENT, false);
const startInfections = new GameValue(15, 330, 160, 15, 'Begin infecties', 3, type.INT, false);
const daysTilRecovery = new GameValue(15, 345, 160, 15, 'Herstelperiode', 14, type.INT, false);

let simulationSteps = 0;

const promptX = 150;
const promptY = 75;
const promptWidth = 300;
const promptHeight = 45;

let communityRows;
let communityColumns;
const communityVerticalSize = 5;
const communityHorizontalSize = 5;
const numCommunities = new GameValue(15, 360, 160, 15, 'Aantal huishoudens', 20, type.INT, true);
/** @type Community[] */
let communities = [];
let uniqueCommunityCount = 0;

const commVertSpace = 100;
const commHorzSpace = 100;
const startVertOffset = 50;
const startHorzOffset = 35;
const desiredSimulationWidth = 400; // Pixels
const desiredSimulationHeight = 320; // Pixels

const glyphWidth = 14;
const glyphHeight = 14;
const colSpacePix = 0;
const rowSpacePix = 0;

const canvasName = 'myCanvas';
/** @type HTMLCanvasElement */
// @ts-ignore
const canvas = document.getElementById(canvasName);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const canvasLeft = canvas.offsetLeft;
const canvasTop = canvas.offsetTop;

/**
 * @param {KeyboardEvent} event
 */
const canvasKeyHandler = (event) => keyers.forEach((keyer) => keyer.keyHandler(event.key));

canvas.addEventListener('click', canvasClickHandler);
canvas.addEventListener('mousemove', canvasMouseoverHandler);
window.addEventListener('keydown', canvasKeyHandler);

const fontSize = '14pt';
const fontFamily = '"Lucida Console", Monaco, monospace';
const fontString = fontSize + ' ' + fontFamily;
ctx.font = fontString;

const smallFontSize = '9pt';
const smallFontString = smallFontSize + ' ' + fontFamily;

let tickNumber = 0;
let done = false;

const animationFPS = 30;
const animationTick = Math.floor(1000 / animationFPS); // in milliseconds

let uniquePersonCount = 0;

let sickCount = [startInfections.value];
let sickTodayCount = [startInfections.value];
let totalCases = [startInfections.value];

let buffer = '';

// Button Cluster values
let speedControl = null;
let runStop;
let reset;

let started = false;
let restoreResetButton;

const colors = {
    BACKGROUND:	'#000',
    HEALTHY:	'#00FF00',
    SICK:		'#FF0000',
    RECOVERED: 	'#FFFF00',
    LGRAY:		'rgb(189, 255, 189)'
};

const health = {
    HEALTHY: 'healthy',
    SICK:  'sick',
    RECOVERED: 'recovered'
};

const speeds = {
    SPEED1:	60, // 60 frames, or about 2 sec
    SPEED2:	30, // 30 frames, or about 1 sec
    SPEED3:	15, // 15 frames, or about 0.5 sec
    SPEED4:	8, // 8 frames, or about 0.25 sec
    SPEED5:	2 // 2 frame, or about 0.06 sec
};

const state = {
    RUN: 'RUN',
    STOP: 'STOP'
};


const flags = {
    NORMAL: 'NORMAL',
    RESTART: 'RESTART'
};

class Person {
    state;
    xPos;
    yPos;
    community;
    position;
    daysSick;
    moving;
    moveToX;
    moveToY;
    startX;
    startY;
    moveFrame;
    uniquePerson;

    /**
     * @param {any} xPos
     * @param {any} yPos
     * @param {Community} community
     * @param {number} place
     */
    constructor(xPos, yPos, community, place) {
        this.state = health.HEALTHY;
        this.xPos = xPos;
        this.yPos = yPos;
        this.community = community;
        this.position = place;
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
        ctx.fillText('π', this.xPos, this.yPos, glyphWidth - colSpacePix * 2);

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
}


class Community {
    uniqueCommunity;
    height;
    width;
    xPos;
    yPos;
    size;
    /** @type Person[] */
    people;

    /**
     * @param {number} size
     * @param {number} xPos
     * @param {number} yPos
     */
    constructor(size, xPos, yPos) {
        // We want every community to be square-ish
        const linearSize = Math.ceil(Math.sqrt(size));
        this.uniqueCommunity = uniqueCommunityCount++;
        this.height = linearSize;
        this.width = linearSize;
        this.xPos = xPos;
        this.yPos = yPos;
        this.size = size;
        this.people = new Array(size);
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
        const botY = this.yPos + (this.height) * glyphWidth;

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
                this.spreadHelper(this.getNorth(i), toSpread); // Spread north
                this.spreadHelper(this.getSouth(i), toSpread); // Spread south
                this.spreadHelper(this.getEast(i), toSpread); // Spread east
                this.spreadHelper(this.getWest(i), toSpread); // Spread west
            }
        }


        for (let i = 0, len = toSpread.length; i < len; i++) {
            const target = toSpread[i];
            this.people[target].state = health.SICK;
        }
    }

    /**
     * @param {number} number
     */
    getNorth(number) {
        const north = number - this.width;
        if (north < 0) {
            return null;
        }
        return number - this.width;
    }

    /**
     * @param {number} number
     */
    getSouth(number) {
        const south = number + this.width;
        if (south > (this.size - 1)) {
            return null;
        }
        return south;
    }

    /**
     * @param {number} number
     */
    getEast(number) {
        const col = number % this.width;
        if (col == this.width - 1) {
            return null;
        }
        return number + 1;
    }

    /**
     * @param {number} number
     */
    getWest(number) {
        const col = number % this.width;
        if (col == 0) {
            return null;
        }
        return number - 1;
    }

    /**
     * @param {number} target
     * @param {any[]} toSpread
     */
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

    pickRandomPerson = () => this.people[Math.floor(Math.random() * this.size)];

    countSick = () => this.people.filter((person) => person.state == health.SICK).length;

    countSickToday = () => this.people.filter((person) => person.state == health.SICK && !person.daysSick).length;

    countTotalCases = () => this.people.filter((person) => person.state != health.HEALTHY).length;

    countMoving = () => this.people.filter((person) => person.moving).length;

    update = () => this.people.forEach((person) => person.update());
}


class Graph {
    data;
    xPos;
    yPos;
    yHeight;
    xWidth;
    name;
    defaultBarSize;

    /**
     * @param {any[]} dataVector
     * @param {number} xPos
     * @param {number} yPos
     * @param {number} yHeight
     * @param {number} xWidth
     * @param {string} name
     */
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
                const tickMax = ticks[ ticks.length - 1 ];
                ctx.fillText(`${ticks[i]}`, this.xPos - 2 * glyphWidth, axisY - (ticks[i] / tickMax) * this.yHeight + glyphHeight * 0.5);
                ctx.beginPath();
                ctx.moveTo(this.xPos, axisY - (ticks[i] / tickMax) * this.yHeight);
                ctx.lineTo(this.xPos - 5, axisY - (ticks[i] / tickMax) * this.yHeight);
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

        //			let maxVal = Math.max( this.data.length, this.xWidth);
        const ticks = this.generateTickMarks(dayCapacity);

        let i;
        for (i = 0; i < ticks.length; i++) {
            ctx.fillText(`${ticks[i]}`, this.xPos + ticks[i] * barSize, axisY + glyphHeight);
        }

        ctx.font = fontString;
    }

    // Assumes the low mark is zero
    /**
     * @param {number} high
     */
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
                const drawHeight = (this.data[i] / maxVal) * this.yHeight;
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

}

class Button {
    xPos;
    yPos;
    width;
    height;
    label;
    value;
    cluster;
    active;
    blink;
    blinkStep;


    /**
     * @param {number} xPos
     * @param {number} yPos
     * @param {number} width
     * @param {number} height
     * @param {string} label
     * @param {string | number} value
     * @param {Cluster} cluster
     * @param {boolean} initial
     * @param {boolean} blink
     */
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
        } else { // is not a blinking button
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
}

class Cluster{
    xPos;
    yPos;
    width;
    height;
    label;
    buttons;
    /** @type {string | number} */
    insideValue;
    /** @type {string | number} */
    value;

    /**
     * @param {number} xPos
     * @param {number} yPos
     * @param {number} width
     * @param {number} height
     * @param {string} label
     */
    constructor(xPos, yPos, width, height, label) {
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

    /**
     * @param {number} xPos
     * @param {number} yPos
     * @param {number} width
     * @param {number} height
     * @param {string} label
     * @param {string | number} value
     * @param {boolean} initial
     * @param {boolean} blink
     */
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

    /**
     * @param {any} value
     */
    update = (value) => this.insideValue = value;

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
}


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

    buffer = '';

    main();
}

function simulationTick() {

    if (reset.value == flags.RESTART) {
        restoreResetButton.clickHandler(0, 0); // restores state of reset.value
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


    // Simulation stuff
    if (tickNumber % speedControl.value == 0) {

        let i;
        // Update simulation variables only at the end of a simulation step
        for (i = 0; i < clusters.length; i++) {
            clusters[i].commit();
        }

        if (runStop.value == state.STOP) {
            refireSimulation();
            return;
        }

        if (!done) {
            for (i = 0; i < communities.length; i++) {
                communities[i].update();
                communities[i].spread();
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

const drawGraphs = () => graphs.forEach((graph) => graph.draw());
const drawValues = () => values.forEach((value) => value.draw());
const drawClusters = () => clusters.forEach((cluster) => cluster.draw());

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

/**
 * @param {{ pageX: number; pageY: number; }} event
 */
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

/**
 * @param {{ pageX: number; pageY: number; }} event
 */
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

const countSick = () => communities.map((community) => community.countSick()).reduce((a, b) => a + b);

const countSickToday = () => communities.map((community) => community.countSickToday()).reduce((a, b) => a + b);

const countTotalCases = () => communities.map((community) => community.countTotalCases()).reduce((a, b) => a + b)

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

/**
 * @param {Community} community
 * @param {number} number
 */
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

    let i;
    for (i = 0; i < numPairs; i++) {
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

/** @type Person */
let scope;

const newScope = () => scope = pickRandomCommunity().pickRandomPerson();

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

const computeTotalPeople = () => communities.map((community) => community.size).reduce((a, b) => a + b);

const pickRandomCommunity = () => communities[Math.floor(Math.random() * numCommunities.value)];

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

const clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

function buildWorld() {
    communities = new Array(numCommunities.value);

    for (let i = 0; i < numCommunities.value; i++) {
        const row = Math.floor(i / communityColumns);
        const col = i % communityColumns;

        const xPos = startHorzOffset + commHorzSpace * col;
        const yPos = startVertOffset + commVertSpace * row;

        communities[i] = new Community(communityVerticalSize * communityHorizontalSize, xPos, yPos);

    }

    graphs.push(new Graph(sickCount, 400, 20, 100, 300, 'Ziek vandaag'));
    graphs.push(new Graph(sickTodayCount, 400, 165, 50, 300, 'Nieuwe zieken per dag'));
    graphs.push(new Graph(totalCases, 400, 270, 100, 300, 'Totaal aantal zieken'));

    if (!speedControl) {
        speedControl = new Cluster(200, 315, 100, 15, 'Snelheid:');
        speedControl.addButton(200, 315, 20, 15, '1', speeds.SPEED1, false, false);
        speedControl.addButton(220, 315, 20, 15, '2', speeds.SPEED2, false, false);
        speedControl.addButton(240, 315, 20, 15, '3', speeds.SPEED3, true, false);
        speedControl.addButton(260, 315, 20, 15, '4', speeds.SPEED4, false, false);
        speedControl.addButton(280, 315, 20, 15, '5', speeds.SPEED5, false, false);

        runStop = new Cluster(200, 345, 100, 15, 'Simulatie:');
        runStop.addButton(200, 345, 50, 15, 'Start', state.RUN, true, true);
        runStop.addButton(250, 345, 50, 15, 'Stop', state.STOP, false, true);

        reset = new Cluster(200, 390, 100, 15, 'Simulatie Reset');
        restoreResetButton = reset.addButton(-100, -100, 1, 1, 'Normal', flags.NORMAL, true, false);
        reset.addButton(300, 375, 60, 15, 'Reset', flags.RESTART, false, false);
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

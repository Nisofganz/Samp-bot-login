const samp = require('samp-query');
const net = require('net');
const SocksProxyAgent = require('socks-proxy-agent');
const UserAgent = require('user-agents');
const fs = require('fs');
const crypto = require('crypto');

class SampBot {
    constructor(serverIP, serverPort, proxy, spawnPosition) {
        this.serverIP = serverIP;
        this.serverPort = serverPort;
        this.proxy = `socks5://${proxy}`;
        this.userAgent = new UserAgent().toString();
        this.socket = null;
        this.username = this.generateUsername();
        this.password = this.generatePassword();
        this.lastActionTime = Date.now();
        this.connectionAttempts = 0;
        this.isLoggedIn = false;
        this.characterCreated = false;
        this.isSpawned = false;
        this.spawnPosition = spawnPosition;
        this.actionDelays = {
            min: 500,
            max: 2000
        };
        this.typingSpeed = {
            min: 50,
            max: 200
        };
    }

    generateUsername() {
        const randomNumber = Math.floor(Math.random() * 10000);
        return `BotNisof${randomNumber}`;
    }

    generatePassword() {
        return crypto.randomBytes(8).toString('hex');
    }

    connect() {
        if (this.connectionAttempts >= 3) {
            console.log(`Too many connection attempts for ${this.username}. Switching proxy.`);
            this.proxy = this.getNewProxy();
            this.connectionAttempts = 0;
        }

        const agent = new SocksProxyAgent(this.proxy);
        this.socket = new net.Socket({ agent });

        this.socket.connect(this.serverPort, this.serverIP, () => {
            console.log(`Connected to server with proxy ${this.proxy}`);
            this.simulateHumanBehavior();
        });

        this.socket.on('data', (data) => {
            this.handleServerResponse(data);
        });

        this.socket.on('close', () => {
            console.log(`Connection closed for ${this.username}`);
            if (!this.isLoggedIn) {
                setTimeout(() => this.connect(), 5000 + Math.random() * 5000);
            }
        });

        this.socket.on('error', (error) => {
            console.log(`Error for ${this.username}: ${error.message}`);
            this.connectionAttempts++;
            setTimeout(() => this.connect(), 5000 + Math.random() * 5000);
        });
    }

    handleServerResponse(data) {
        const response = data.toString();
        console.log(`Received: ${response}`);

        if (response.includes('banned') || response.includes('kicked')) {
            console.log(`${this.username} was banned or kicked. Attempting bypass...`);
            this.attemptBypass();
        } else if (response.includes('successfully registered')) {
            console.log(`${this.username} successfully registered`);
            this.login();
        } else if (response.includes('successfully logged in')) {
            console.log(`${this.username} successfully logged in`);
            this.isLoggedIn = true;
            if (!this.characterCreated) {
                this.createCharacter();
            } else {
                this.simulateGameplay();
            }
        } else if (response.includes('character created')) {
            console.log(`${this.username} character created`);
            this.characterCreated = true;
            this.simulateGameplay();
        }
    }

    async simulateHumanBehavior() {
        await this.delay(1000, 3000);
        await this.register();
        await this.delay(2000, 5000);
        await this.login();
        if (this.isLoggedIn) {
            await this.createCharacter();
            await this.simulateGameplay();
        }
    }

    async register() {
        await this.simulateTyping(this.username);
        await this.simulateTyping(this.password);
        const registerPacket = this.createPacket('REGISTER');
        this.socket.write(registerPacket);
        console.log(`Sent register packet for ${this.username}`);
    }

    async login() {
        await this.simulateTyping(this.username);
        await this.simulateTyping(this.password);
        const loginPacket = this.createPacket('LOGIN');
        this.socket.write(loginPacket);
        console.log(`Sent login packet for ${this.username}`);
    }

    async createCharacter() {
        await this.delay(1000, 3000);
        const characterPacket = this.createPacket('CREATE_CHARACTER');
        this.socket.write(characterPacket);
        console.log(`Sent create character packet for ${this.username}`);
    }

    async simulateGameplay() {
        if (!this.isLoggedIn || !this.characterCreated) {
            console.log(`${this.username} is not ready to spawn.`);
            return;
        }

        await this.spawnCharacter();
        await this.moveToFormation();
        await this.startNormalBehavior();
    }

    async spawnCharacter() {
        console.log(`${this.username} is spawning...`);
        const spawnPacket = this.createSpawnPacket();
        this.socket.write(spawnPacket);
        await this.delay(1000, 2000);
        this.isSpawned = true;
        console.log(`${this.username} has spawned.`);
    }

    async moveToFormation() {
        console.log(`${this.username} is moving to formation position...`);
        const movePacket = this.createMovePacket(this.spawnPosition.x, this.spawnPosition.y, this.spawnPosition.z);
        this.socket.write(movePacket);
        await this.delay(2000, 3000);
        console.log(`${this.username} is in position.`);
    }

    async startNormalBehavior() {
        while (this.isSpawned) {
            await this.performRandomAction();
            await this.delay(5000, 15000);
        }
    }

    async performRandomAction() {
        const actions = [
            () => this.sendChat('Hello everyone!'),
            () => this.sendChat('/time'),
            () => this.sendChat('/me looks around'),
            () => this.moveSlightly(),
        ];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        await randomAction();
    }

    async moveSlightly() {
        const offset = {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            z: 0
        };
        const newPosition = {
            x: this.spawnPosition.x + offset.x,
            y: this.spawnPosition.y + offset.y,
            z: this.spawnPosition.z + offset.z
        };
        const movePacket = this.createMovePacket(newPosition.x, newPosition.y, newPosition.z);
        this.socket.write(movePacket);
    }

    async simulateTyping(text) {
        const typingTime = text.length * (Math.random() * (this.typingSpeed.max - this.typingSpeed.min) + this.typingSpeed.min);
        await this.delay(typingTime, typingTime + 500);
    }

    async delay(min, max) {
        const delayTime = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delayTime));
    }

    createMovementPacket() {
        const packet = Buffer.alloc(20);
        return packet;
    }

    createPacket(type) {
        const packet = Buffer.alloc(68);
        packet.write('SAMP');
        packet.writeUInt8(this.username.length, 4);
        packet.write(this.username, 5);
        packet.write(this.password, 5 + this.username.length);
        packet.write(this.userAgent, 37);
        return packet;
    }

    sendChat(message) {
        const chatPacket = this.createChatPacket(message);
        this.socket.write(chatPacket);
    }

    createChatPacket(message) {
        const packet = Buffer.alloc(message.length + 3);
        packet.writeUInt8(0x61, 0);
        packet.writeUInt16LE(message.length, 1);
        packet.write(message, 3);
        return packet;
    }

    attemptBypass() {
        this.username = this.generateUsername();
        this.password = this.generatePassword();
        this.proxy = this.getNewProxy();
        setTimeout(() => this.connect(), 10000 + Math.random() * 10000);
    }

    getNewProxy() {
        return proxyList[Math.floor(Math.random() * proxyList.length)];
    }

    createSpawnPacket() {
        const packet = Buffer.alloc(4);
        packet.writeUInt8(0x02, 0);
        return packet;
    }

    createMovePacket(x, y, z) {
        const packet = Buffer.alloc(16);
        packet.writeUInt8(0x03, 0);
        packet.writeFloatLE(x, 1);
        packet.writeFloatLE(y, 5);
        packet.writeFloatLE(z, 9);
        return packet;
    }
}

function readProxiesFromFile(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return data.split('\n').filter(line => line.trim() !== '');
    } catch (err) {
        console.error(`Error reading proxy file: ${err}`);
        process.exit(1);
    }
}


function createBots(count, serverIP, serverPort, proxyList) {
    const bots = [];
    const formationSize = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
        const proxy = proxyList[i % proxyList.length];
        const spawnPosition = {
            x: 2000 + (i % formationSize) * 2,
            y: 2000 + Math.floor(i / formationSize) * 2,
            z: 10
        };
        const bot = new SampBot(serverIP, serverPort, proxy, spawnPosition);
        bots.push(bot);
    }
    return bots;
}


function main() {
    const args = process.argv.slice(2);
    if (args.length !== 4) {
        console.log('Usage: node Sampbot.js <ip> <port> <threads> <proxy_file>');
        process.exit(1);
    }

    const [serverIP, serverPort, threads, proxyFile] = args;
    const proxyList = readProxiesFromFile(proxyFile);

    const bots = createBots(parseInt(threads), serverIP, parseInt(serverPort), proxyList);

    bots.forEach(bot => {
        setTimeout(() => {
            bot.connect();
        }, Math.random() * 30000); 
    });
}


main();
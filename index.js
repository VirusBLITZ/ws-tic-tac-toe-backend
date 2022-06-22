"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var ws_1 = require("ws");
var port = 4040;
console.log("Listening on Port ".concat(port));
var wss = new ws_1.WebSocketServer({ port: port, clientTracking: true });
var Player = /** @class */ (function () {
    function Player(id, ws, alias) {
        this.id = id;
        this.ws = ws;
        this.alias = alias;
    }
    return Player;
}());
var Game = /** @class */ (function () {
    function Game(player0) {
        this.players = [];
        this.board = [
            ["", "", ""],
            ["", "", ""],
            ["", "", ""],
        ];
        this.players.push(player0);
    }
    Game.prototype.join = function (player1) {
        if (this.players.length < 2) {
            this.players.push(player1);
            this.players[0].ws.send("+" + this.players[1].alias); // Tell both players each other's names
            this.players[1].ws.send("+" + this.players[0].alias);
        }
        else {
            player1.ws.send("full");
        }
    };
    Game.prototype.start = function () {
        var beginner = Math.floor(Math.random()); // choose a random player to start
        this.players.forEach(function (player) {
            player.ws.send("start" + beginner);
        });
    };
    return Game;
}());
function newGame(id, player0) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            activeGames[id] = new Game(player0);
            // console.log(activeGames)
            autoClose(id);
            return [2 /*return*/];
        });
    });
}
var autoClose = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        setTimeout(function () {
            delete activeGames[id];
            console.log("Deleted Game due to inactivity");
        }, 43200000);
        return [2 /*return*/];
    });
}); };
var activeGames = {};
function genId() {
    var x = Math.random() * 10000;
    while (x <= 1000) {
        x = Math.random() * 10000;
    }
    return Math.floor(x);
}
function genPlayerId() {
    var x = Math.random() * 100000000;
    while (x <= 10000000) {
        x = Math.random() * 100000000;
    }
    return Math.floor(x);
}
wss.on("connection", function connection(ws) {
    ws.on("message", function message(data) {
        data = String(data);
        if (data.startsWith("new ") && data.length > 4) {
            // Creating a new game
            var id = genId();
            var playerId = genPlayerId();
            ws.id = id;
            ws.playerId = playerId;
            var alias = data.slice(4);
            console.log("NEW GAME:", id);
            console.log("Alias:", alias);
            ws.send(">" + id);
            ws.send("<" + playerId);
            newGame(id, new Player(playerId, ws, alias));
        }
        else if (data.startsWith("+") && data.length > 5) {
            // Joining a game
            var id = data.slice(1, 5);
            if (activeGames[id]) {
                // Game exists
                var playerId = genPlayerId();
                var alias = data.slice(5);
                ws.id = Number(id);
                ws.playerId = Number(playerId);
                activeGames[id].join(new Player(playerId, ws, alias));
                console.log(alias, "joined");
                console.log(activeGames[id]);
            }
            else {
                ws.send(404); // Game not found
            }
        }
        else if (data == "^") {
            if (ws.id != undefined) {
                activeGames[ws.id].players.forEach(function (player) {
                    if (ws.playerId == player.id) {
                        player.ready = !player.ready;
                        console.log("Player", player.alias, "is" + (player.ready ? "" : " not") + " ready");
                        ws.send(String(player.ready));
                    }
                });
                activeGames[ws.id].players[0].ws.send("^");
            }
        }
        else if (data == "start") {
            if (ws.id != undefined && activeGames[ws.id].players[1].ready) {
                activeGames[ws.id].start();
            }
        }
        else {
            ws.send(400); // Unknown command
        }
    });
});

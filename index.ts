import { WebSocket, WebSocketServer } from "ws";

const port = 4040;
console.log(`Listening on Port ${port}`);

const wss = new WebSocketServer({ port: port, clientTracking: true });

class Game {
  constructor(player0: WebSocket) {
    this.players.push(player0)
  }
  players: Array<WebSocket>
  board = [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ]
  join(player1: WebSocket) {
    this.players.push(player1)
    this.players[0].send('+')
  }
  start(){
    const beginner = Math.floor(Math.random()) // choose a random player to start
    this.players.forEach(player => {
      player.send('start')
    });
  }
}

async function newGame(id, player0): Promise<void> {
  activeGames[id] = new Game()
}

const activeGames = {}

function genId(): number{
  let x = Math.random()*10000
  while (x <= 1000) {
    x = Math.random()*10000
  }
  return Math.floor(x)
}

wss.on("connection", function connection(ws) {
  ws.on("message", function message(data, isBinary) {
    if (String(data) === "new") {
      const id = genId()
      console.log('NEW GAME:', id);
      ws.send(id)
      newGame(id, ws)
    } else {
      try {
        //
      } catch {

      }
    }
  });
});

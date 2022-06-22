import { WebSocket, WebSocketServer } from "ws"

const port = 4040
console.log(`Listening on Port ${port}`)

const wss = new WebSocketServer({ port: port, clientTracking: true })

class Player {
  constructor(id: number, ws: WebSocket, alias: string) {
    this.id = id
    this.ws = ws
    this.alias = alias
  }
  alias: string
  id: number
  ready: false
  ws: WebSocket
}

class Game {
  constructor(player0: Player) {
    this.players.push(player0)
  }
  players: Array<Player> = []
  board = [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ]
  join(player1: Player) {
    if (this.players.length < 2) {
      this.players.push(player1)
      this.players[0].ws.send("+" + this.players[1].alias) // Tell both players each other's names
      this.players[1].ws.send("+" + this.players[0].alias)
    } else {
      player1.ws.send("full")
    }
  }
  start() {
    const beginner = Math.floor(Math.random()) // choose a random player to start
    this.players.forEach((player) => {
      player.ws.send("start" + beginner)
    })
  }
}

async function newGame(id, player0): Promise<void> {
  activeGames[id] = new Game(player0)
  // console.log(activeGames)
  autoClose(id)
}

const autoClose = async (id: number): Promise<void> => {
  setTimeout(() => {
    delete activeGames[id]
    console.log("Deleted Game due to inactivity")
  }, 43200000)
}

const activeGames = {}

function genId(): number {
  let x = Math.random() * 10000
  while (x <= 1000) {
    x = Math.random() * 10000
  }
  return Math.floor(x)
}

function genPlayerId(): number {
  let x = Math.random() * 100000000
  while (x <= 10000000) {
    x = Math.random() * 100000000
  }
  return Math.floor(x)
}

wss.on("connection", function connection(ws) {
  ws.on("message", function message(data: String) {
    data = String(data)
    if (data.startsWith("new ") && data.length > 4) {
      // Creating a new game
      const id = genId()
      const playerId = genPlayerId()
      ws.id = id
      ws.playerId = playerId
      const alias = data.slice(4)
      console.log("NEW GAME:", id)
      console.log("Alias:", alias)
      ws.send(">" + id)
      ws.send("<" + playerId)
      newGame(id, new Player(playerId, ws, alias))
    } else if (data.startsWith("+") && data.length > 5) {
      // Joining a game
      const id = data.slice(1, 5)
      if (activeGames[id]) {
        // Game exists
        const playerId = genPlayerId()
        const alias = data.slice(5)
        ws.id = Number(id)
        ws.playerId = Number(playerId)
        activeGames[id].join(new Player(playerId, ws, alias))
        console.log(alias, "joined")
        console.log(activeGames[id])
      } else {
        ws.send(404) // Game not found
      }
    } else if (data == "^") {
      if (ws.id != undefined) {
        activeGames[ws.id].players.forEach((player) => {
          if (ws.playerId == player.id) {
            player.ready = !player.ready
            console.log(
              "Player",
              player.alias,
              "is" + (player.ready ? "" : " not") + " ready"
            )
            ws.send(String(player.ready))
          }
        })
        activeGames[ws.id].players[0].ws.send("^")
      }
    } else if (data == "start") {
      if (ws.id != undefined && activeGames[ws.id].players[1].ready) {
        activeGames[ws.id].start()
      }
    } else {
      ws.send(400) // Unknown command
    }
  })
})

import { createServer } from "https"
import { readFileSync } from "fs"
import { WebSocket, WebSocketServer } from "ws"

const port = 4040
console.log(`Listening on Port ${port}`)

const server = createServer({
  cert: readFileSync("cert.pem"),
  key: readFileSync("privkey.pem"),
})
const wss = new WebSocketServer({
  server,
  clientTracking: true,
})

server.listen(port)

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
  turn = 0
  won: boolean = false
  beginner = -1
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
    console.log("starting game")
    const beginner = Math.floor(Math.random() * 2) // 0 or 1, random player starts
    this.beginner = beginner
    this.players.forEach((player) => {
      player.ws.send("start" + beginner)
    })
  }
  resetBoard() {
    this.board = [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ]
    this.turn = 0
    this.won = false
    this.beginner = this.beginner === 0 ? 1 : 0
    // send every cell to the client one by one
    this.players.forEach((player) => {
      ;[0, 1, 2].forEach((row) => {
        ;[0, 1, 2].forEach((col) => {
          // player.ws.send("=" + row + col + "c")
          player.ws.send("=" + row + col + "c")
        })
      })
    })
  }
  place(player: Player, row: number, col: number) {
    if (this.board[row][col] === "" && !this.won) {
      if (this.turn == 0) {
        // check if player is beginner
        if (this.players[this.beginner] === player) {
          this.board[row][col] = this.players[0] === player ? "x" : "o"
          this.turn++
        }
      } else if (
        (this.turn % 2) - this.beginner === 0 &&
        this.players[0] === player
      ) {
        this.board[row][col] = "x"
        this.turn++
        this.checkWin(0)
      } else if (
        (this.turn % 2) - this.beginner !== 0 &&
        this.players[1] === player
      ) {
        this.board[row][col] = "o"
        this.turn++
        this.checkWin(1)
      }
      this.players.forEach((player) => {
        player.ws.send("=" + row + col + this.board[row][col])
      })
    } else {
      player.ws.send(400)
    }
  }
  checkWin(id: number) {
    if (this.checkRow() || this.checkCol() || this.checkDiag()) {
      this.players.forEach((player) => {
        player.ws.send("win" + id)
      })
      this.won = true
    } else if (this.turn === 9) {
      this.players.forEach((player) => {
        player.ws.send("draw")
      })
    }
  }
  checkRow() {
    for (let i = 0; i < 3; i++) {
      if (
        this.board[i][0] === this.board[i][1] &&
        this.board[i][1] === this.board[i][2] &&
        this.board[i][0] !== ""
      ) {
        return true
      }
    }
    return false
  }
  checkCol() {
    for (let i = 0; i < 3; i++) {
      if (
        this.board[0][i] === this.board[1][i] &&
        this.board[1][i] === this.board[2][i] &&
        this.board[0][i] !== ""
      ) {
        return true
      }
    }
    return false
  }
  checkDiag() {
    if (
      this.board[0][0] === this.board[1][1] &&
      this.board[1][1] === this.board[2][2] &&
      this.board[0][0] !== ""
    ) {
      return true
    } else if (
      this.board[0][2] === this.board[1][1] &&
      this.board[1][1] === this.board[2][0] &&
      this.board[0][2] !== ""
    ) {
      return true
    }
    return false
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
      } else {
        ws.send(400)
      }
    } else if (data.startsWith("=") && data.length === 3) {
      if (ws.id != undefined) {
        activeGames[ws.id].players.forEach((player) => {
          if (ws.playerId == player.id) {
            activeGames[ws.id].place(player, Number(data[1]), Number(data[2]))
          }
        })
      }
    } else if (data == "restart") {
      if (ws.id != undefined) {
        activeGames[ws.id].resetBoard()
      }
    } else {
      ws.send(400) // Unknown command
    }
  })
})

const express = require("express")
const cors = require("cors")
// const fetch = require("node-fetch")

const app = express()
const PORT = 1543

const API_URL = "https://analytics.vturb.net/times/user_engagement_by_field"
const API_KEY =
  "ba817d5a51ecf8be6c9a964814fca16f192c61225b80d7da4601d20e1bf3bd1c"

// Libera CORS
app.use(cors())
app.use(express.json())

app.post("/evasao", async (req, res) => {
  const clientBody = req.body

  console.log(clientBody)
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "X-Api-Token": API_KEY,
        "Content-Type": "application/json",
        "X-Api-Version": "v1",
      },
      body: JSON.stringify(clientBody),
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    console.error("Erro ao consultar a API:", error)
    res.status(500).json({ error: "Erro interno ao consultar a API" })
  }
})

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})

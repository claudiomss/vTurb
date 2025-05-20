const express = require("express")
const cors = require("cors")
const fs = require("fs")
const https = require("https")

const app = express()

const API_KEY =
  "ba817d5a51ecf8be6c9a964814fca16f192c61225b80d7da4601d20e1bf3bd1c"

// Libera CORS
app.use(cors())
app.use(express.json())

const options = {
  key: fs.readFileSync("/etc/letsencrypt/live/descobre.app/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/descobre.app/fullchain.pem"),
}

app.post("/evasao", async (req, res) => {
  const clientBody = req.body

  // console.log(clientBody)
  try {
    const response = await fetch(
      "https://analytics.vturb.net/times/user_engagement_by_field",
      {
        method: "POST",
        headers: {
          "X-Api-Token": API_KEY,
          "Content-Type": "application/json",
          "X-Api-Version": "v1",
        },
        body: JSON.stringify(clientBody),
      }
    )

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    console.error("Erro ao consultar a API:", error)
    res.status(500).json({ error: "Erro interno ao consultar a API" })
  }
})

app.post("/analytics", async (req, res) => {
  const clientBody = req.body

  // console.log(clientBody)
  try {
    const response = await fetch(
      "https://analytics.vturb.net/sessions/stats_by_field",
      {
        method: "POST",
        headers: {
          "X-Api-Token": API_KEY,
          "Content-Type": "application/json",
          "X-Api-Version": "v1",
        },
        body: JSON.stringify(clientBody),
      }
    )

    const data = await response.json()
    // console.log(data)

    let dataFormat
    for (let pais of data) {
      if (pais.grouped_field == "United States") {
        dataFormat = {
          views: pais.total_viewed_device_uniq,
          start: pais.total_started_device_uniq,
          play_rate: pais.play_rate,
          checkout: pais.total_clicked_device_uniq,
          pitch_unid: pais.total_over_pitch,
          pitch_taxa: pais.over_pitch_rate,
          conversao: pais.total_conversions,
          conv_rate: pais.overall_conversion_rate,
          amount: pais.total_amount_brl,
        }
      }
    }
    // console.log(dataFormat)
    res.status(response.status).json(dataFormat)
  } catch (error) {
    console.error("Erro ao consultar a API:", error)
    res.status(500).json({ error: "Erro interno ao consultar a API" })
  }
})

https.createServer(options, app).listen(443, () => {
  console.log("Servidor rodando em https://descobre.app")
})

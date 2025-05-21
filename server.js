const express = require("express")
const cors = require("cors")
const { google } = require("googleapis")
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

app.post("/rates_early", async (req, res) => {
  const { start_date, end_date, player_id } = req.body

  if (!start_date || !end_date || !player_id) {
    return res
      .status(400)
      .json({ error: "start_date, end_date e player_id são obrigatórios" })
  }

  const fullStart = `${start_date} 00:00:01`
  const fullEnd = `${end_date} 23:59:59`

  const bodyBase = {
    start_date: fullStart,
    end_date: fullEnd,
    player_id,
    field: "country",
    video_duration: 3600,
    timezone: "America/Sao_Paulo",
    pitch_time: 1800,
  }

  try {
    // Fetch evasao
    const evasaoRes = await fetch("https://www.descobre.app:443/evasao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...bodyBase, values: ["United States"] }),
    })

    const evasaoData = await evasaoRes.json()

    // Fetch analytics
    const analyticsRes = await fetch("https://www.descobre.app:443/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyBase),
    })

    const analyticsData = await analyticsRes.json()

    const groupedValues = evasaoData[0]?.grouped_values || []
    const startCount = analyticsData.start || 0

    const lead_1min = groupedValues
      .filter((entry) => entry.timed <= 60)
      .reduce((acc, curr) => acc + curr.total_users, 0)

    const lead_2min = groupedValues
      .filter((entry) => entry.timed <= 120)
      .reduce((acc, curr) => acc + curr.total_users, 0)

    const lead_1min_rate = startCount
      ? ((lead_1min / startCount) * 100).toFixed(2)
      : 0
    const lead_2min_rate = startCount
      ? ((lead_2min / startCount) * 100).toFixed(2)
      : 0

    res.json({
      lead_1min_rate: parseFloat(lead_1min_rate),
      lead_2min_rate: parseFloat(lead_2min_rate),
    })
  } catch (error) {
    console.error("Erro na rota /rates_early:", error.message)
    res
      .status(500)
      .json({ error: "Erro ao calcular taxas", details: error.message })
  }
})

app.get("/lista-vturb", async (req, res) => {
  const auth = new google.auth.GoogleAuth({
    keyFile: "service.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  const SHEET_ID = "16h0GnsFjsli6HjVCD7aM1NZPkzG74C0O32IQIGLU2a4"
  const RANGE = "Página1!A2:E"

  try {
    const client = await auth.getClient()
    const sheets = google.sheets({ version: "v4", auth: client })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    })

    const rows = response.data.values

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Nenhum dado encontrado." })
    }

    // Mapear para objetos
    const dados = rows.map(([nicho, id_video, nome, pitch, oferta]) => ({
      nicho,
      id_video,
      nome,
      pitch,
      oferta,
    }))

    res.json(dados)
  } catch (error) {
    console.error("Erro ao buscar dados do Sheets:", error)
    res.status(500).json({ error: "Erro interno ao buscar dados." })
  }
})

https.createServer(options, app).listen(443, () => {
  console.log("Servidor rodando em https://descobre.app")
})

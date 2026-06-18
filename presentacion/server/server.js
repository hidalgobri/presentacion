import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const response = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-0",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: req.body.message
          }
        ]
      })
    }
  );

  const data = await response.json();
  res.json(data);
});

app.listen(3000);
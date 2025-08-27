import express from "express";
import cors from "cors";

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  console.log("GET /users");
  res.send("GET /users endpoint");
});

app.get("/:id", (req, res) => {
  console.log(`GET /users/${req.params.id}`);
  res.send(`GET /users/${req.params.id} endpoint`);
});

app.post("/", (req, res) => {
  console.log("POST /users");
  res.send("POST /users endpoint");
});

app.put("/:id", (req, res) => {
  console.log(`PUT /users/${req.params.id}`);
  res.send(`PUT /users/${req.params.id} endpoint`);
});

app.delete("/:id", (req, res) => {
  console.log(`DELETE /users/${req.params.id}`);
  res.send(`DELETE /users/${req.params.id} endpoint`);
});

app.listen(port, () => {
  console.log(`User Service listening at http://localhost:${port}`);
});

import express from 'express';
import {API_KEY} from './secrets';
import type {QueueEntryDto} from './dto/QueueEntryDto';
import {WebSocketServer} from 'ws';
import * as http from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static files from dist
// app.use(express.static(path.join(__dirname, '../', 'dist')));

let queue: QueueEntryDto[] = []; // store YouTube video IDs

let mainViewer: any = undefined; // will store a client ID

app.post('/api/queue/add', async (req, res) => {
  console.log(req.body);
  console.log(req);
  const {videoId} = req.body;
  let exist = queue.filter(item => item.videoId === videoId);
  if (exist.length > 0) return;
  await getVideoDetails(videoId).then(data => {
    if (data) {
      queue.push({
        title: data.title,
        votes: 0,
        videoId: videoId,
        thumbnail: data.thumbnail,
      });
    }
  });
  broadcastQueueUpdate();
  res.json(queue);
});

app.post('/api/queue/removePlayed', async (_req, _res) => {
  queue.splice(0, 1);
  broadcastQueueUpdate();
});

app.post('/api/queue/remove', async (req, res) => {
  queue.splice(req.body.index, 1);
  broadcastQueueUpdate();
  res.json(queue);
});

app.post('/api/queue/vote', async (req, res) => {
  let {id, voteValue} = req.body;
  queue[id].votes += voteValue;
  while (id > 1 && queue[id - 1].votes < queue[id].votes) {
    let temp = queue[id - 1];
    queue[id - 1] = queue[id];
    queue[id] = temp;
    id--;
  }
  while (id < queue.length - 1 && queue[id + 1].votes > queue[id].votes) {
    let temp = queue[id + 1];
    queue[id + 1] = queue[id];
    queue[id] = temp;
    id++;
  }

  broadcastQueueUpdate();
  res.json(queue);
});

app.get('/api/queue/current', async (_req, res) => {
  res.json(queue[0]);
});

app.get('/api/queue/list', async (_req, res) => {
  res.json(queue);
});

async function getVideoDetails(videoId: string) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

  const data = await res.json();
  if (data.items.length === 0) return null;

  const video = data.items[0];
  return {
    title: video.snippet.title,
    thumbnail: video.snippet.thumbnails.high.url,
  };
}

// Catch-all route to serve index.html for SPA
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const serverProd = http.createServer(app);
const wss = new WebSocketServer({ server: serverProd });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("message", (message) => {
    const msg = JSON.parse(message.toString());
    console.log(msg);
    if(msg.type === "claimMaster"){
      console.log("try claim master");
      if(mainViewer){
        mainViewer.send(JSON.stringify({
          type: 'masterRemoved'
        }))
      }
      mainViewer = ws;
      ws.send(JSON.stringify({
        type: 'masterAccepted'
      }))
    }
  })
});

function broadcastQueueUpdate(){
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'queueUpdate',
        queue: queue
      }));
    }
  })
}

serverProd.listen(3000, () => {
  console.log('Backend running on http://localhost:3000');
});
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import neo4j from 'neo4j-driver';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;

// Neo4j Driver Setup
const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

let driver: any;
try {
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  console.log('Neo4j driver initialized');
} catch (error) {
  console.error('Failed to initialize Neo4j driver:', error);
}

app.use(express.json());

// API Routes
app.post('/api/cypher', async (req, res) => {
  const { query, params } = req.body;
  if (!driver) return res.status(500).json({ error: 'Neo4j driver not initialized' });

  const session = driver.session();
  try {
    const result = await session.run(query, params);
    
    // Check if it was a write operation to broadcast refresh
    const summary = result.summary;
    const counters = summary.counters.updates();
    const isWrite = Object.values(counters).some(val => (val as number) > 0);
    
    if (isWrite) {
      io.emit('REFRESH_GRAPH');
    }

    res.json({
      records: result.records.map(r => r.toObject()),
      summary: summary.counters.updates()
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.close();
  }
});

app.post('/api/clear', async (req, res) => {
  if (!driver) return res.status(500).json({ error: 'Neo4j driver not initialized' });
  const session = driver.session();
  try {
    await session.run('MATCH (n) DETACH DELETE n');
    io.emit('REFRESH_GRAPH');
    res.json({ message: 'Database cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

app.post('/api/restore', async (req, res) => {
  if (!driver) return res.status(500).json({ error: 'Neo4j driver not initialized' });
  const { query } = req.body;
  const session = driver.session();
  try {
    // Use provided query or default hard-coded seed script
    const seedQuery = query || `
      CREATE (p1:Person {name: 'Alice', hobby: 'Hiking', age: 30})
      CREATE (p2:Person {name: 'Bob', hobby: 'Hiking', favoriteMovie: 'The Matrix', age: 35})
      CREATE (p3:Person {name: 'Charlie', favoriteMovie: 'The Matrix', age: 25})
      MERGE (p1)-[:SHARED_INTEREST {type: 'hobby'}]->(p2)
      MERGE (p2)-[:SHARED_INTEREST {type: 'movie'}]->(p3)
    `;
    await session.run('MATCH (n) DETACH DELETE n');
    await session.run(seedQuery);
    io.emit('REFRESH_GRAPH');
    res.json({ message: 'Database restored successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Helper to fetch graph data for visualization
app.get('/api/graph', async (req, res) => {
  if (!driver) return res.status(500).json({ error: 'Neo4j driver not initialized' });
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (n)
      OPTIONAL MATCH (n)-[r]->(m)
      RETURN n, r, m
    `);

    const nodes = new Map();
    const relationships = new Set();

    result.records.forEach(record => {
      const n = record.get('n');
      const r = record.get('r');
      const m = record.get('m');

      if (n) {
        nodes.set(n.identity.toString(), {
          id: n.identity.toString(),
          labels: n.labels,
          properties: n.properties,
          caption: n.properties.name || n.labels[0] || n.identity.toString()
        });
      }
      if (m) {
        nodes.set(m.identity.toString(), {
          id: m.identity.toString(),
          labels: m.labels,
          properties: m.properties,
          caption: m.properties.name || m.labels[0] || m.identity.toString()
        });
      }
      if (r) {
        relationships.add(JSON.stringify({
          id: r.identity.toString(),
          from: r.start.toString(),
          to: r.end.toString(),
          type: r.type,
          properties: r.properties,
          caption: r.type
        }));
      }
    });

    res.json({
      nodes: Array.from(nodes.values()),
      relationships: Array.from(relationships).map((s: any) => JSON.parse(s))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

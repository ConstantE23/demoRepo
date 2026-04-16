# Neo4j Collaborative Sandbox - Azure VM Deployment Guide

This guide explains how to migrate from a Streamlit-based system to this high-performance, real-time Neo4j dashboard on an Azure VM.

## Prerequisites

- An Azure VM (Ubuntu 22.04 LTS recommended)
- Port 3000 (App) and 7687 (Neo4j Bolt) open in Azure Network Security Group (NSG)
- A Neo4j instance (Local on VM or AuraDB)

## Step 1: Install Node.js and Tools

Connect to your VM via SSH and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

## Step 2: Deploy the Application

1. **Upload Code**: Export the ZIP from AI Studio and upload it to your VM (e.g., using `scp` or GitHub).
2. **Extract and Enter Directory**:
   ```bash
   unzip your-app.zip
   cd your-app
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
nano .env
```

Paste and modify the following:

```env
NODE_ENV=production
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password
```

## Step 4: Build and Start

1. **Build the Frontend**:
   ```bash
   npm run build
   ```
2. **Start with PM2**:
   ```bash
   pm2 start server.ts --name neo-dash --interpreter tsx
   ```
3. **Save PM2 list**:
   ```bash
   pm2 save
   sudo pm2 startup
   ```

## Step 5: Accessing the App

- **Viewer Mode**: `http://your-vm-ip:3000`
- **Presenter Mode**: `http://your-vm-ip:3000?presenter=true`

## Comparison: Streamlit vs. This System

| Feature | Streamlit | This System |
|---------|-----------|-------------|
| **Rendering** | Python-based DOM (Slow for large graphs) | WebGL/Canvas (High performance) |
| **Real-time** | Polling or Page Refresh | WebSockets (Instant sync) |
| **UX** | Generic Widgets | Custom "Elegant Dark" Dashboard |
| **Interaction** | Limited | Full Pan/Zoom/Drag |

## Troubleshooting

- **Socket Connection Failed**: Ensure port 3000 is open in Azure NSG.
- **Neo4j Connection Failed**: Ensure Neo4j is running and Bolt port 7687 is accessible.
- **Presenter Buttons Missing**: Ensure you are using the `?presenter=true` query parameter.

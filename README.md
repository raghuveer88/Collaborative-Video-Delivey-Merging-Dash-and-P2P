# Collaborative-Video-Delivey-Merging-Dash-and-P2P

Hybrid DASH + Peer-to-Peer Video Streaming Prototype


## Overview

This repository contains a proof-of-concept implementation of a hybrid video-streaming system that integrates HTTP-DASH with a lightweight P2P overlay. Each viewer acts as a mini-cache, fetching segments from other peers when possible and falling back to the origin server as needed. The goals are to:

- **Reduce origin/CDN egress** by ≥ 90 %
- **Improve Quality of Experience** (shorter startup delay, fewer rebuffer events, higher sustained bitrate)
- **Demonstrate resilience** under churn and packet-loss impairments

## Repository Structure

├── origin-server.js # HTTP server for DASH MPD & segments <br/>
├── tracker.js # Lightweight tracker registry <br/>
├── peer.js # Peer proxy (cache + P2P + fallback + metrics) <br/>
├── public/ <br/>
│ ├── dash/ # Pre-segmented .mp4 → .m4s + dash.mpd <br/>
│ └── client/ # client.html + dash.js player <br/>
├── run-demo.sh # Launch origin, tracker, N peers, open browsers <br/>
├── docker-compose.yml # Docker Compose definition for Origin, Tracker, Peers <br/>
└── segment.sh # FFmpeg script to (re)generate 4 s chunks at 4 bitrates <br/>



---

## Environment & Prerequisites
### Need specific versions to exectue the code 
- **Operating System**  
  - Development: Windows 11 with WSL2 
  - Alternative: Linux
 
- **WSL2 Distribution**  
   - Ubuntu 22.04 LTS only.  
   - Ensure you’ve installed `ubuntu-wsl2-custom-kernel` package.

- **Node.js & NPM**  
  - Tested on Node.js v22.15.0 (≥ v12.22.9 minimum)
  - Install via [nvm](https://github.com/nvm-sh/nvm) or your package manager

- **FFmpeg**
  - Version 4.4.2
  - For segmenting video into DASH chunks  
  - Install via `sudo apt install ffmpeg`

- **Docker & Docker Compose** (for containerized runs)
  - Use **Docker CE 20.10.x**
  - Docker Desktop (Windows) or Docker Engine (Linux) 
  - Compose v2 plugin (`docker compose` CLI)
  - Add your user to the `docker` group and reboot WSL2.

---

## Local Setup

1. Clone the repo
   
2. Install dependencies - npm install

3. Generate DASH segments - bash ./segment.sh /path/to/high_video.mp4

4. Run the demo - chmod +x run-demo.sh Then Next command - ./run-demo.sh 5
5. The client launching - Start-Process "http://localhost:8001/client/client.html"
   
## Containerized Setup (Docker Compose)
1. Build and start services <br/>
   docker compose up --build <br/>
This creates three services on the p2pnet network: <br/>
origin → port 9000 <br/>
tracker → port 7000 <br/>
peer → default port 8001 (scaleable) <br/>

2. Scale peers - docker compose up --scale peer=10

3. Simulate impairments
  docker kill dash-p2p-demo_peer_1 dash-p2p-demo_peer_2 … (for churn) <br/>
  docker exec dash-p2p-demo_peer_3 \
  tc qdisc add dev eth0 root netem loss 10% 25% (for packet loss)

4. shutdown - docker compose down <br/>

The metrics will be on the browser console. We need to collect if for each peer and get our infeerences from the values.


   

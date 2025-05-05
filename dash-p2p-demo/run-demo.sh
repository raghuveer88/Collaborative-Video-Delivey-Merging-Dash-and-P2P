#!/usr/bin/env bash
set -e

# Usage: ./run-demo.sh <num-peers>
if [[ -z "$1" ]]; then
  echo "Usage: $0 <number-of-peers>"
  exit 1
fi

NUM_PEERS="$1"
BASE_PORT=8000

# Start origin server
npm run origin &
ORIGIN_PID=$!

# Start tracker
npm run tracker &
TRACKER_PID=$!

echo "▶ Origin (pid=$ORIGIN_PID) listening on port 9000"
echo "▶ Tracker (pid=$TRACKER_PID) listening on port 7000"

# Function to clean up on exit
cleanup() {
  echo "\n🛑 Shutting down..."
  kill $ORIGIN_PID $TRACKER_PID
  pkill -P $$ npm    # kill any npm child processes
  exit 0
}
trap cleanup SIGINT SIGTERM

# Launch peers and open browser windows
for i in $(seq 1 $NUM_PEERS); do
  PORT=$((BASE_PORT + i))
  npm run peer -- --port $PORT &
  PEER_PID=$!
  echo "▶ Peer $i (pid=$PEER_PID) listening on port $PORT"
  
  # Open default Windows browser (from WSL)
  cmd.exe /C start http://localhost:$PORT/client/client.html
  sleep 0.5  # small delay between launches
done

echo "\n✅ Launched $NUM_PEERS peers with browser tabs opened."
echo "   Press Ctrl+C to stop all services."

# Wait indefinitely (until Ctrl+C)
wait

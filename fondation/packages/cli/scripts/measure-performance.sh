#!/bin/bash

# Start timer
start_time=$(date +%s.%N)

# Run the command and capture output
bun src/cli.ts run -p "analyse the docs folder" 2>&1 | while IFS= read -r line; do
    echo "$line"
    # Check if this is Claude's first message
    if [[ "$line" == *"I'll analyze"* ]] || [[ "$line" == *"Let me"* ]]; then
        end_time=$(date +%s.%N)
        elapsed=$(echo "$end_time - $start_time" | bc)
        echo "TIME TO FIRST MESSAGE: ${elapsed} seconds"
        pkill -P $$ -f "bun src/cli.ts"
        exit 0
    fi
done
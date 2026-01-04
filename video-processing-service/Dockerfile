
#########################################################################################
# DOCKERFILE ARCHITECTURE SUMMARY:
# 1. IMMUTABILITY: This file builds a "frozen" environment (Image).
# 2. LAYER CACHING: Commands are ordered from least-frequent change to most-frequent. 
#    - System tools (ffmpeg) and Dependencies (npm install) are placed BEFORE source code.
#    - Result: Changes to code won't trigger a re-install of all libraries (High Efficiency).
# 3. ISOLATION: The app runs in its own virtualized filesystem, decoupled from the Host OS.
# 4. SCALABILITY: This Image is a "Blueprint." We can spin up 1 or 1,000 identical 
#    Containers (Instances) instantly for high-load processing.
# --- DOCKER BUILD OPTIMIZATION ---
# Docker uses a layer-based caching system. Each command in this file creates a new layer.
# We copy 'package.json' and run 'npm install' BEFORE copying the rest of the source code
# to take advantage of this caching mechanism. 
#
# Since dependencies change much less frequently than the actual source code, 
# this ensures that the heavy 'npm install' step is skipped unless package.json 
# is modified. This significantly reduces build times during development.
#########################################################################################




# Step 1: Use an official Node.js runtime as the base image (the OS foundation)
FROM node:18

# Step 2: Define the working directory inside the container
WORKDIR /app

# Step 3: Install system dependencies. 
# We need 'ffmpeg' for video transcoding (converting videos to 360p/720p)
RUN apt-get update && apt-get install -y ffmpeg

# Step 4: Optimization Step - Copy ONLY the package files first.
# This allows Docker to cache the 'npm install' layer if dependencies haven't changed.
COPY package*.json ./

# Step 5: Install the Node.js libraries specified in package.json
RUN npm install

# Step 6: Copy the rest of your application source code into the image
# This layer changes frequently, so we keep it at the end to keep builds fast.
COPY . .

# Step 7: Document that the container listens on port 3000
EXPOSE 3000

# Step 8: Define the runtime command. 
# This is what starts your Video Worker when the container launches.
CMD [ "npm", "start" ]
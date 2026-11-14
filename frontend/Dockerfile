# --- Stage 1: install dependencies and build the static site -------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Dependencies first (cached layer while package*.json is unchanged). npm ci = exact lockfile.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Browser-side backend URL, baked into the bundle at build time (see src/services/api.ts).
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# `build` = `tsc -b && vite build`: a type error fails the image build.
RUN npm run build

# --- Stage 2: serve the static output ------------------------------------------------
FROM nginx:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

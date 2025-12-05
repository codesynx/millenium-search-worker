FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies (this will run postinstall -> prisma generate)
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src/

# Generate Prisma Client (in case postinstall didn't run)
RUN bunx prisma generate

# Run the worker
CMD ["bun", "start"]

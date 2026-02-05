#!/bin/bash

# SilentSOS Deployment Script
# This script sets up and deploys the SilentSOS application

set -e

echo "🚀 Starting SilentSOS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

print_success "npm $(npm -v) detected"

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Install server dependencies
print_status "Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
print_status "Installing client dependencies..."
cd client
npm install
cd ..

print_success "All dependencies installed successfully"

# Check for environment files
print_status "Checking environment configuration..."

if [ ! -f "server/.env" ]; then
    print_warning "Server .env file not found. Creating from example..."
    cp server/.env.example server/.env
    print_warning "Please edit server/.env with your configuration before starting the server"
fi

if [ ! -f "client/.env" ]; then
    print_warning "Client .env file not found. Creating from example..."
    cp client/.env.example client/.env
    print_warning "Please edit client/.env with your Firebase configuration"
fi

# Build client for production
print_status "Building client for production..."
cd client
npm run build
cd ..

print_success "Client built successfully"

# Check if Firebase CLI is installed (optional)
if command -v firebase &> /dev/null; then
    print_status "Firebase CLI detected. You can deploy using 'firebase deploy'"
else
    print_warning "Firebase CLI not found. Install with: npm install -g firebase-tools"
fi

# Create startup scripts
print_status "Creating startup scripts..."

# Development startup script
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "Starting SilentSOS in development mode..."
npm run dev
EOF

# Production startup script
cat > start-prod.sh << 'EOF'
#!/bin/bash
echo "Starting SilentSOS in production mode..."

# Start server in background
cd server
npm start &
SERVER_PID=$!

# Serve client build
cd ../client
npx serve -s build -l 3000 &
CLIENT_PID=$!

echo "Server PID: $SERVER_PID"
echo "Client PID: $CLIENT_PID"
echo "SilentSOS is running!"
echo "Client: http://localhost:3000"
echo "Server: http://localhost:5000"

# Wait for processes
wait $SERVER_PID $CLIENT_PID
EOF

chmod +x start-dev.sh start-prod.sh

print_success "Startup scripts created"

# Create Docker files for containerized deployment
print_status "Creating Docker configuration..."

cat > Dockerfile << 'EOF'
# Multi-stage build for SilentSOS
FROM node:18-alpine AS builder

# Build client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build

# Build server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Copy server
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/build ./client/build

# Install serve for client
RUN npm install -g serve

# Expose ports
EXPOSE 3000 5000

# Start script
COPY start-prod.sh ./
RUN chmod +x start-prod.sh

CMD ["./start-prod.sh"]
EOF

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  silentsos:
    build: .
    ports:
      - "3000:3000"
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - CLIENT_URL=http://localhost:3000
    volumes:
      - ./server/.env:/app/server/.env
    restart: unless-stopped

  # Optional: Add database service
  # mongodb:
  #   image: mongo:5
  #   ports:
  #     - "27017:27017"
  #   volumes:
  #     - mongodb_data:/data/db
  #   restart: unless-stopped

# volumes:
#   mongodb_data:
EOF

print_success "Docker configuration created"

# Create Firebase configuration
print_status "Creating Firebase configuration..."

cat > firebase.json << 'EOF'
{
  "hosting": {
    "public": "client/build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "functions": {
    "source": "server",
    "runtime": "nodejs18"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
EOF

cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Emergency data - authenticated users can create, admins can read all
    match /emergencies/{emergencyId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Learning data - users can write their own
    match /learning_data/{docId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
EOF

cat > firestore.indexes.json << 'EOF'
{
  "indexes": [
    {
      "collectionGroup": "emergencies",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "emergencies",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF

print_success "Firebase configuration created"

# Final instructions
print_success "🎉 SilentSOS deployment setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure environment variables:"
echo "   - Edit server/.env with your email and Firebase settings"
echo "   - Edit client/.env with your Firebase configuration"
echo ""
echo "2. Start the application:"
echo "   - Development: ./start-dev.sh"
echo "   - Production: ./start-prod.sh"
echo "   - Docker: docker-compose up"
echo ""
echo "3. For Firebase deployment:"
echo "   - Install Firebase CLI: npm install -g firebase-tools"
echo "   - Login: firebase login"
echo "   - Initialize: firebase init"
echo "   - Deploy: firebase deploy"
echo ""
echo "4. Access the application:"
echo "   - Client: http://localhost:3000"
echo "   - Server: http://localhost:5000"
echo "   - Emergency Dashboard: http://localhost:3000/emergency-dashboard"
echo ""
echo "⚠️  Important Notes:"
echo "- HTTPS is required for sensor access in production"
echo "- Configure your Firebase project settings"
echo "- Set up email service for emergency notifications"
echo "- Test all sensor permissions on target devices"
echo ""
print_success "Happy coding! 🚀"
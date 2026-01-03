#!/bin/bash

# 🚀 Robust Setup Verification Script
# This script checks your environment and helps troubleshoot issues

echo "======================================"
echo "🔍 Time Keeper Setup Verification"
echo "======================================"
echo ""

# Check if .env file exists
echo "1️⃣  Checking .env file..."
if [ -f .env ]; then
  echo "   ✅ .env file found"
  
  # Check for required variables
  if grep -q "VITE_SUPABASE_URL" .env; then
    echo "   ✅ VITE_SUPABASE_URL is set"
  else
    echo "   ❌ VITE_SUPABASE_URL is missing!"
  fi
  
  if grep -q "VITE_SUPABASE_ANON_KEY" .env; then
    echo "   ✅ VITE_SUPABASE_ANON_KEY is set"
  else
    echo "   ❌ VITE_SUPABASE_ANON_KEY is missing!"
  fi
else
  echo "   ❌ .env file NOT found!"
  echo ""
  echo "   📝 Create a .env file with:"
  echo "      VITE_SUPABASE_URL=https://your-project.supabase.co"
  echo "      VITE_SUPABASE_ANON_KEY=your-anon-key-here"
  echo ""
fi

echo ""

# Check if node_modules exists
echo "2️⃣  Checking dependencies..."
if [ -d node_modules ]; then
  echo "   ✅ node_modules found"
else
  echo "   ❌ node_modules NOT found!"
  echo "   📦 Run: npm install"
  echo ""
fi

echo ""

# Check if database setup file exists
echo "3️⃣  Checking database setup files..."
if [ -f robust-complete-database-setup.sql ]; then
  echo "   ✅ robust-complete-database-setup.sql found"
  echo "   📋 Have you run this in Supabase SQL Editor?"
  echo "      👉 https://app.supabase.com → SQL Editor → Paste & Run"
else
  echo "   ❌ robust-complete-database-setup.sql NOT found!"
fi

echo ""

# Check if project is in git repo
echo "4️⃣  Checking Git repository..."
if [ -d .git ]; then
  echo "   ✅ Git repository found"
  
  # Check git status
  if git diff --quiet; then
    echo "   ✅ No uncommitted changes"
  else
    echo "   ⚠️  You have uncommitted changes"
  fi
else
  echo "   ⚠️  Not a Git repository (optional)"
fi

echo ""
echo "======================================"
echo "📋 Setup Checklist"
echo "======================================"
echo ""
echo "Have you completed these steps?"
echo ""
echo "[ ] 1. Created .env file with Supabase credentials"
echo "[ ] 2. Ran 'npm install' to install dependencies"
echo "[ ] 3. Ran 'robust-complete-database-setup.sql' in Supabase"
echo "[ ] 4. Restarted dev server after creating .env"
echo "[ ] 5. Logged into the app"
echo "[ ] 6. Checked browser console for errors"
echo ""
echo "======================================"
echo "🚀 Next Steps"
echo "======================================"
echo ""

# Suggest next action
if [ ! -f .env ]; then
  echo "👉 CREATE .env file with Supabase credentials"
elif [ ! -d node_modules ]; then
  echo "👉 RUN: npm install"
else
  echo "👉 START the dev server:"
  echo "   npm run dev"
  echo ""
  echo "👉 OPEN the diagnostic panel in the Projects tab"
  echo "   Click 'Test Insert' to verify database setup"
  echo ""
  echo "👉 CHECK browser console (F12) for any errors"
fi

echo ""
echo "======================================"
echo "📚 Documentation"
echo "======================================"
echo ""
echo "📖 Setup Guide: ROBUST-SETUP-GUIDE.md"
echo "🐛 Troubleshooting: Check browser console (F12)"
echo "💾 Database Script: robust-complete-database-setup.sql"
echo ""
echo "======================================"

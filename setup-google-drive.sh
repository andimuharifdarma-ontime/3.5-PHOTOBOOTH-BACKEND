#!/bin/bash

# Script untuk setup Google Drive Auto-Backup
# Author: AI Assistant
# Date: 2025-11-07

echo "🚀 Setting up Google Drive Auto-Backup..."
echo ""

# Warna untuk output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check apakah file .env.local sudah ada
if [ -f .env.local ]; then
    echo -e "${YELLOW}⚠️  File .env.local sudah ada!${NC}"
    read -p "Apakah Anda ingin menambahkan konfigurasi Google Drive? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Setup dibatalkan."
        exit 0
    fi
    echo "" >> .env.local
    echo "# Google Drive Backup Configuration (Added by setup script)" >> .env.local
else
    echo -e "${GREEN}✅ Membuat file .env.local baru...${NC}"
    touch .env.local
    echo "# Environment Variables" > .env.local
    echo "" >> .env.local
    echo "# Google Drive Backup Configuration" >> .env.local
fi

# Tambahkan konfigurasi Google Drive
cat >> .env.local << 'EOF'
GOOGLE_DRIVE_FOLDER_ID=10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw
GOOGLE_SERVICE_ACCOUNT_EMAIL=photobooth-uploader@photobooth-backup.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGXkllCY7C58g+\nRlWEGl/i/wOyy/Xn9MB3kf0+FGbQSljqIwFoMb6RIY5xKalLe2EDc476fRWsZKtM\nGM+w+6Nz+Jur60ajI4VRqrfaqhc4i+iA0zZSxPlQYXMmsrsx2VRA3BHXB+5BDRi9\nkcYA9anStVwVeP34yNvnV0XLHdQC2Zuq0k9ZMlJ+zf1/SV/rYn6ZqPMNVnz669hV\n3LEWkZ6gQelc0tcBxT2DGT5G7CZTXgPRBriiVQHSwwein98Vy/ulB67LCT27765d\nArJFwr/8tWnrdrfEHEBnt5Og9Lj/O2wYgDTAiQ93pWQvk2ZWw5fAgQm9TR1spMhI\nBaL+4MN/AgMBAAECggEAKM5Vh8jPCs4WVaUvS0UHq5DtCFdHpyckfpRUBXS576gT\noVqBHBd7jaxa+nFpB4OCYezgISwhDL0KtdU2yEADkEQ4dcWo2r9gWfvl5T/vFe1F\n71ZDiwRFCyF4yCGlO2xrFgqPSu4xN0WD7N8zXZgrjpJLNomUqRxcjDraOx3QMqOH\nWL6/88GKbg0MZBkGgqJPEWYwqaREIHZx3GRLEcUl24Z8HKSsA5otcHNhtQKFKtdR\nSwlM/zVCeFCc+135WmMZqoVd63WaIIlGDbFM4U74HCPwA1oHkiQT99QBE7Jh4it8\nfm2kf3oNtnohL+pFzvsVv/0+TdYz1biuWNp4+TLxvQKBgQDiZ3cXS0w3jPG9nv8U\nS3H2jozK1tCIsosUaMFjHsc29qyH8wgRIerpU3RTvuZBfyCw+FVQWdPxUUxSFZjY\nWUB43w2LSeF4ZP1TVK10cOs/w8gYkn9dSvCGENVmJqKlPaLKY7Fmtc0/mGZeu77A\nQ8ZgP6olTOekTmwVRfxMS1Vz1QKBgQDgTJyTRvrY4V5rjEtFc0fqNmZksjMqqa+I\n9YGgoDMnvgJYoN+tRNxyAYEecJYXxQeXfCOPGyTjeNAJh7E/tzDiiFG5/GwEACs+\nsS+Q5YukNFSub37vrRCcC1OtNoCR9y0Vnd3WBkedY6ZdoIDFJ4I9YQOWOzyRTU3r\nCzYqW9rIAwKBgF2M8yCk9HFfw+Pedvgj1ItUi8ikyrYxUFa2knIqnZaQhuoF+ida\nJH8VBNQ15V7a8N8vPdFdzL3CIg8o7Wc4OfO39xi/BnOBB0wPiTy8C/jlJSFCJ26d\nMJW1DviOrlYpCcMnPn56UL0ec+5hFYjMeIP8yolvJag232JK8N11o3GhAoGAY3iW\nV5o61MPdo8Rr/TjKw8usTSvaFSl7dzmpaxqglRdm4vc1Oxo2yThxkpZLee8fFscu\n3eAj091YJWHP8XnEbDIYTGrtXDjW9M6PUar66q9qfpFjsdcGbq13RnHNQu5jSBri\nrm/KgroWpZ7wfH6w+5dyh8VtbuLhk0M9mjtyIxECgYEA3sR6Xht1z9VNLMFwJwRL\nd4nMbY0Tb1JU/8KZLj5qNN88TRGZP1L4QbrZewK0X2y08EwbmJOQ8iLBIGGhjcmD\npzM8mt8hGfrQkXTVe+R5IUvdfA6TuI6w9j4wZ5evakkDwGj054QwjE6WNtNMYDZY\n3TIm1Y9HUvRgc2IvVJwZE4s=\n-----END PRIVATE KEY-----\n"
EOF

echo ""
echo -e "${GREEN}✅ Konfigurasi Google Drive berhasil ditambahkan!${NC}"
echo ""
echo "📁 Google Drive Folder:"
echo "   https://drive.google.com/drive/folders/10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw"
echo ""
echo "📝 File yang dibuat/diupdate:"
echo "   - .env.local"
echo ""
echo -e "${YELLOW}⚠️  PENTING:${NC}"
echo "   1. Jangan commit file .env.local ke Git!"
echo "   2. Restart development server: npm run dev"
echo "   3. Test dengan menyelesaikan sesi photobooth"
echo ""
echo -e "${GREEN}🎉 Setup selesai! Baca GOOGLE_DRIVE_SETUP.md untuk detail lebih lanjut.${NC}"


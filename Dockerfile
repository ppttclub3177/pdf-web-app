FROM node:20-bookworm

WORKDIR /app

ENV NODE_ENV=development
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  poppler-utils \
  ghostscript \
  qpdf \
  libreoffice \
  tesseract-ocr \
  fonts-dejavu-core \
  fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

RUN npx playwright install --with-deps chromium

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

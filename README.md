# LiveStreaming Setup Guide

## Description

This repository is designed to demonstrate how to use Agora services (WebSDK, Agora Chat & Agora Real-time Speech to text) in a live event application. Follow the steps below to set up and run the project locally.

## Prerequisites

- Node.js (v14 or higher)
- `pnpm` package manager

## Getting Started

### 1. Clone the Repository

First, clone the repository to your local machine:

```bash
git clone https://github.com/jayalbo/LiveStreaming
cd LiveStreaming
```

### 2. Configure the Environment Variables

Inside the project directory, you will find a file named `.env.example`. Complete the required fields with your Agora credentials and other configurations:

```
AGORA_CID=xxxxxxxxxxxxxxx
AGORA_APP_SECRET=xxxxxxxxxxxxxxx
AGORA_APP_ID=xxxxxxxxxxxxxxx
ORG_NAME=xxxxxxx
APP_CERTIFICATE=xxxxxxxxxxxxxxx
APP_NAME=xxxxxxx
APP_REST_API=a41.chat.agora.io
PORT=3000
```

### 3. Rename `.env.example` to `.env`

After completing the fields in `.env.example`, rename the file to `.env`:

```bash
mv .env.example .env
```

### 4. Install Dependencies

Use `pnpm` to install the necessary dependencies:

```bash
pnpm install
```

### 5. Start the Development Server

Run the following command to start the development server:

```bash
pnpm run start:dev
```

### 6. Open the Application in Your Browser

Once the server is running, open your browser and navigate to:

```
http://localhost:3000/
```

If you specified a different port in the `.env` file, replace `3000` with your specified port.

### That's It!

Your application should now be up and running. You can interact with the live event and test the Agora features.

## Troubleshooting

If you encounter any issues, please check:

1. The `.env` file has been filled out correctly.
2. The Agora credentials are valid.
3. The correct port is specified in your `.env` file.

Feel free to open an issue if you need further assistance.

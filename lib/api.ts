import axios from "axios"

// Vercel deploy: set NEXT_PUBLIC_API_URL in project environment variables.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: apiBaseUrl,
})


import axios from "axios";
import { env } from "../../shared/env.js";

const figmaClient = axios.create({
  baseURL: env.figma!.HOST,
  headers: {
    "X-Figma-Token": env.figma!.TOKEN,
  },
});

figmaClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429 && !error.config._retried) {
      error.config._retried = true;
      const retryAfter = parseInt(error.response.headers["retry-after"] ?? "5", 10);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return figmaClient(error.config);
    }
    return Promise.reject(error);
  }
);

export default figmaClient;

import axios from "axios";

const CONFIG_URL = import.meta.env.VITE_API_BASE_URL!;
const BACKEND_URL_KEY = "rtk:backend-url";

export interface AppConfig {
  backendUrl: string;
}

function readCached(): AppConfig | null {
  try {
    const backendUrl = sessionStorage.getItem(BACKEND_URL_KEY);
    return backendUrl !== null ? { backendUrl } : null;
  } catch {
    return null;
  }
}

function writeCached(config: AppConfig): void {
  try {
    sessionStorage.setItem(BACKEND_URL_KEY, config.backendUrl);
  } catch {
    // Storage unavailable — config still flows through the resolved promise.
  }
}

let inFlight: Promise<AppConfig> | null = null;

export async function getAppConfig(): Promise<AppConfig> {
  const cached = readCached();
  if (cached) return cached;

  if (!inFlight) {
    inFlight = axios
      .post(
        `${CONFIG_URL}/AnonymousDataGet/ExecuteJson/SPMasterAdminAnonymous/4`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      .then(({ data }) => {
        if (data?.isSuccess) {
          const res = JSON.parse(data?.result);
          const config: AppConfig = {
            backendUrl: res.WorkerUrl,
          };
          writeCached(config);
          return config;
        } else {
          return {
            backendUrl: "",
          };
        }
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

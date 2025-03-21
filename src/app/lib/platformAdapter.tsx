import {
  BaseDirectory,
  exists,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { ClusterData, ConfigFile } from "./definies";
import CryptoJS from "crypto-js";

const SECRET_KEY =
  "PHtbiVY0URXE4kbtvyBq38JXVgvSRW8yI6qQfuD8+yhA2SVfi6w4YSjBrnGHI93W3MDtzBsBIU2iN6VF0eL91S+OvsR2+aO+jNmL6XkB139iJruEio1YV2LdpwswyH3Y";

// 加密函数
export const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

// 解密函数
export const decrypt = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export interface PlatformAdapter {
  readConfigData(): Promise<ConfigFile>;
  writeConfigData(file: ConfigFile): void;
}

export class TauriAdapter implements PlatformAdapter {
  readConfigData = async () => {
    const fileExists = await exists("joint.json", {
      baseDir: BaseDirectory.Home,
    });
    if (!fileExists) {
      return [];
    }

    const jsonContent = await readTextFile("joint.json", {
      baseDir: BaseDirectory.Home,
    });

    const jsonData = JSON.parse(jsonContent);
    if (jsonData.clusters.length > 0) {
      jsonData.clusters = jsonData.clusters.map((cluster: any) => {
        return {
          ...cluster,
          password:
            cluster.password != "" && cluster.password != null
              ? decrypt(cluster.password)
              : cluster.password,
        };
      });
    }
    return jsonData;
  };

  writeConfigData = async (file: ConfigFile) => {
    if (file.clusters.length > 0) {
      file.clusters = file.clusters.map((cluster: ClusterData) => {
        return {
          ...cluster,
          password:
            cluster.password != "" && cluster.password != null
              ? encrypt(cluster.password)
              : cluster.password,
        };
      });
    }

    await writeTextFile("joint.json", JSON.stringify(file, null, 2), {
      baseDir: BaseDirectory.Home,
    });
  };
}

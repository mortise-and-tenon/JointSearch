import {
  BaseDirectory,
  exists,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { ConfigFile } from "./definies";

export interface PlatformAdapter {
  readConfigData(): Promise<ConfigFile>;
  writeConfigData(file: ConfigFile): void;
}

export class TauriAdapter implements PlatformAdapter {
  readConfigData = async () => {
    const fileExists = await exists("jointes.json", {
      baseDir: BaseDirectory.Home,
    });
    if (!fileExists) {
      return [];
    }

    const jsonContent = await readTextFile("jointes.json", {
      baseDir: BaseDirectory.Home,
    });

    const jsonData = JSON.parse(jsonContent);
    return jsonData;
  };

  writeConfigData = async (file: ConfigFile) => {
    await writeTextFile("jointes.json", JSON.stringify(file, null, 2), {
      baseDir: BaseDirectory.Home,
    });
  };
}

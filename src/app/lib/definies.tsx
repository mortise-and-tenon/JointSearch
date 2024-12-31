import { BaseDirectory, exists, readTextFile } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";

export type ThemeData = {
  Color: {
    primary: string;
    secondary: string;
  };
};

//酱紫
export const GoldenPurpleTheme: ThemeData = {
  Color: {
    primary: "#9254de",
    secondary: "#b37feb",
  },
};

export type ClusterData = {
  id: string;
  name: string;
  protocol: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
};

export type ConfigFile = {
  clusters: ClusterData[];
};

//集群信息
export type ClusterDetail = {
  name: string;
  cluster_name: string;
  cluster_uuid: string;
  version: string;
};

//读取配置文件中的集群数据
export const readConfigFile = async () => {
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
  return jsonData["clusters"];
};

export const query = async (
  id: string,
  method: string,
  api: string = "",
  body?: any
) => {
  const clusters: ClusterData[] = await readConfigFile();
  const clusterFilter = clusters.filter((item) => item.id === id);
  if (clusterFilter.length == 0) {
    throw new Error("404");
  }
  const cluster = clusterFilter[0];
  const url = `${cluster.protocol}://${cluster.host}:${cluster.port}${api}`;

  const headers: HeadersInit = {};

  if (cluster.username != "") {
    const authValue = btoa(`${cluster.username}:${cluster.password}`);
    headers["Authorization"] = `Basic ${authValue}`;
  }

  try {
    const response = await fetch(`${url}`, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (response.ok) {
      return await response.json();
    } else {
      console.log("query,not ok.");
      throw new Error("400");
    }
  } catch (error) {
    console.log("query,error:", error);
    throw new Error("400");
  }
};

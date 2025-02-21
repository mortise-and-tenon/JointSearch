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
  id?: string;
  name?: string;
  protocol?: string;
  host?: string;
  port?: number;
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

//节点信息
export type NodeData = {
  key: string;
  ip: string;
  name: string;
  master: boolean;
  role: string;
  cpu: number;
  ram: number;
  heap: number;
};

//节点详情
export type NodeDetail = {
  id: string;
  name: string;
  version: string;
  roles: string[];
  host: string;
  ip: string;
  transport_address: string;
  total_indexing_buffer: number;
  os_name: string;
  os_arch: string;
  os_version: string;
  process_id: number;
  process_refresh_interval_in_millis: number;
  process_mlockall: boolean;
};

//索引信息
export type IndexData = {
  key: React.Key;
  name: string;
  uuid: string;
  health: string;
  status: string;
  docs_count: number;
  docs_deleted: number;
  primary: number;
  replicas: number;
  primary_store: string;
  total_store: string;
};

//集群节点详情列表
export type ClusterNodes = {
  name: string;
  nodes: NodeDetail[];
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

export const getHttp = async (api: string = "", id?: string, body?: any) => {
  if (id == undefined) {
    throw new Error("400");
  }

  return requestHttp(id, "GET", api, body);
};

export const putHttp = async (api: string = "", id?: string, body?: any) => {
  if (id == undefined) {
    throw new Error("400");
  }

  return requestHttp(id, "PUT", api, body);
};

export const deleteHttp = async (api: string = "", id?: string, body?: any) => {
  if (id == undefined) {
    throw new Error("400");
  }

  return requestHttp(id, "DELETE", api, body);
};

export const postHttp = async (api: string = "", id?: string, body?: any) => {
  if (id == undefined) {
    throw new Error("400");
  }

  return requestHttp(id, "POST", api, body);
};

export const requestHttp = async (
  id: string,
  method: string,
  api: string = "",
  body?: any
) => {
  const clusters: ClusterData[] = await readConfigFile();
  const clusterFilter = clusters.filter((item) => item.id === id);
  if (clusterFilter.length == 0) {
    throw new Error("400");
  }
  const cluster = clusterFilter[0];
  const url = `${cluster.protocol}://${cluster.host}:${cluster.port}${api}`;

  const headers: HeadersInit = {
    "content-type": "application/json",
  };

  if (cluster.username != "") {
    const authValue = btoa(`${cluster.username}:${cluster.password}`);
    headers["Authorization"] = `Basic ${authValue}`;
  }

  const options = {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : null,
  };

  try {
    console.log("url:" + url);
    console.log(options);

    const response = await fetch(`${url}`, options);

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      let body = {};
      if (contentType?.includes("application/json")) {
        body = await response.json();
      } else {
        body = await response.text();
      }
      return { success: true, body: body };
    } else {
      const body = await response.json();
      console.log(body);
      return { success: false, body: body };
    }
  } catch (error) {
    console.log("http,error");
    console.log(error);
    throw new Error("500");
  }
};

import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory, exists, readTextFile } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { PlatformAdapter, TauriAdapter } from "./platformAdapter";

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
  verify?: boolean;
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

const adapter: PlatformAdapter = new TauriAdapter();

//读取配置文件数据
export const readConfigFile = async () => {
  return await adapter.readConfigData();
};

//写入配置文件数据
export const writeConfigData = async (file: ConfigFile) => {
  await adapter.writeConfigData(file);
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

//自动匹配集群信息的http请求
export const requestHttp = async (
  id: string,
  method: string,
  api: string = "",
  body?: any
) => {
  const configFile: ConfigFile = await readConfigFile();
  const clusters: ClusterData[] = configFile["clusters"];

  const clusterFilter = clusters.filter((item) => item.id === id);
  if (clusterFilter.length == 0) {
    throw new Error("400");
  }
  const cluster = clusterFilter[0];
  const url = `${cluster.protocol}://${cluster.host}:${cluster.port}${api}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (cluster.username != "") {
    const authValue = btoa(`${cluster.username}:${cluster.password}`);
    headers["Authorization"] = `Basic ${authValue}`;
  }

  const options: RequestOptions = {
    method: method,
    url: url,
    verify: cluster.verify != undefined ? cluster.verify : false,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    const response = await fetchHttp(options);

    console.log(response);

    if (response.status == 200) {
      const contentType = response.headers["content-type"];
      let body = {};
      if (contentType?.includes("application/json")) {
        body = JSON.parse(response.body);
      } else {
        body = response.body;
      }
      return { success: true, body: body };
    } else {
      const body = JSON.parse(response.body);
      return { success: false, body: body, status: response.status };
    }
  } catch (error) {
    console.log("http,error");
    console.log(error);
    throw new Error("500");
  }
};

//请求选项
export interface RequestOptions {
  method: string;
  url: string;
  verify?: boolean;
  headers?: Record<string, string>;
  body?: string | undefined;
}

//响应数据
export interface ApiResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

//封装后的通用http请求
export const fetchHttp = async (options: RequestOptions) => {
  console.log(options);

  return await invoke<ApiResponse>(`make_request`, { options });
};

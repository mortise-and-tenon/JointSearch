"use client";

import { LeftOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Col,
  Descriptions,
  message,
  Progress,
  Row,
  Select,
  Skeleton,
  Statistic,
  Table,
  TableProps,
  Tag,
} from "antd";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "../../lib/GlobalProvider";
import { ClusterNodes, NodeData, NodeDetail, query } from "../../lib/definies";

export default function Node() {
  const { i18n, theme, clusters, currentCluster, onSelectCluster } =
    useContext(GlobalContext);

  const [messageApi, contextHolder] = message.useMessage();

  //加载状态
  const [isLoading, setIsLoading] = useState(false);

  //节点简要数据
  const [nodeData, setNodeData] = useState<NodeData[]>([]);

  //是否展示节点详情
  const [isShowDetail, setIsShowDetail] = useState(false);

  //加载节点详情
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);

  //集群节点详情
  const [clusterNodes, setClusterNodes] = useState<ClusterNodes>({
    name: "",
    nodes: [],
  });

  const columns: TableProps<NodeData>["columns"] = [
    {
      title: "IP",
      dataIndex: "ip",
      key: "ip",
    },
    {
      title: i18n("node.table_name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: i18n("node.table_master"),
      dataIndex: "master",
      key: "master",
      render: (isMaster) => (
        <>
          {isMaster ? <Tag color={theme.Color.primary}>是</Tag> : <Tag>否</Tag>}{" "}
        </>
      ),
      sorter: (a, b) => (a ? 1 : -1),
    },
    {
      title: i18n("node.table_role"),
      key: "role",
      dataIndex: "role",
      render: (role) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: i18n("node.table_cpu"),
      key: "cpu",
      dataIndex: "cpu",
      render: (cpu) => (
        <Progress
          percent={cpu}
          format={(percent) => `${percent}%`}
          strokeColor={{
            "0%": "#66FF66",
            "50%": "#FFFF66",
            "100%": "#FF6666",
          }}
        />
      ),
    },
    {
      title: i18n("node.table_ram"),
      key: "ram",
      dataIndex: "ram",
      render: (ram) => (
        <Progress
          percent={ram}
          format={(percent) => `${percent}%`}
          strokeColor={{
            "0%": "#66FF66",
            "50%": "#FFFF66",
            "100%": "#FF6666",
          }}
        />
      ),
    },
    {
      title: i18n("node.table_heap"),
      key: "heap",
      dataIndex: "heap",
      render: (heap) => (
        <Progress
          percent={heap}
          format={(percent) => `${percent}%`}
          strokeColor={{
            "0%": "#66FF66",
            "50%": "#FFFF66",
            "100%": "#FF6666",
          }}
        />
      ),
    },
  ];

  useEffect(() => {
    queryNode();
    onShowDetail();
  }, [currentCluster]);

  //查询节点简要数据
  const queryNode = async () => {
    if (currentCluster.id == undefined) {
      messageApi.warning(i18n("node.select_cluster"));
      return;
    }
    try {
      const data: string = await query(
        currentCluster.id,
        "GET",
        "/_cat/nodes?h=ip,name,master,role,cpu,ram.percent,heap.percent"
      );
      const lines = data.split("\n");
      const nodeDatas = new Array<NodeData>();
      lines.forEach((line, index) => {
        if (line === "") {
          return;
        }
        const array = line.split(" ");
        const node: NodeData = {
          key: array[1],
          ip: array[0],
          name: array[1],
          master: array[2] === "*",
          role: array[3],
          cpu: Number(array[4]),
          ram: Number(array[5]),
          heap: Number(array[6]),
        };
        nodeDatas.push(node);
      });
      setNodeData(nodeDatas);
    } catch (error) {
      message.warning(i18n("node.query_node_error_tip"));
    }
  };

  //刷新集群节点数据展示
  const onRefreshNode = () => {
    setIsLoading(true);
    messageApi.open({
      type: "info",
      content: i18n("node.refresh"),
      duration: 1,
    });

    queryNode();

    setIsLoading(false);
  };

  //查询、展示集群节点详情
  const onShowDetail = async () => {
    setIsShowDetail(true);
    if (currentCluster.id == undefined) {
      return;
    }
    try {
      const data = await query(currentCluster.id, "GET", "/_nodes");
      const clusterNodes: ClusterNodes = {
        name: data.cluster_name,
        nodes: [],
      };
      const nodeKeys = Object.keys(data.nodes);
      nodeKeys.forEach((key) => {
        const nodeDetail: NodeDetail = {
          id: key,
          name: data.nodes[key].name,
          version: data.nodes[key].version,
          roles: data.nodes[key].roles,
          host: data.nodes[key].host,
          ip: data.nodes[key].ip,
          transport_address: data.nodes[key].transport_address,
          total_indexing_buffer: data.nodes[key].total_indexing_buffer,
          os_name: data.nodes[key].os.name,
          os_arch: data.nodes[key].os.arch,
          os_version: data.nodes[key].os.version,
          process_id: data.nodes[key].process.id,
          process_refresh_interval_in_millis:
            data.nodes[key].process.refresh_interval_in_millis,
          process_mlockall: data.nodes[key].process.mlockall,
        };

        clusterNodes.nodes.push(nodeDetail);
      });
      setClusterNodes(clusterNodes);
      setIsLoadingDetail(false);
    } catch (error) {
      message.warning(i18n("node.query_node_error_tip"));
    }
  };

  //返回节点概要
  const onReturnNode = () => {
    setIsShowDetail(false);
    setIsLoadingDetail(true);
  };

  return (
    <>
      {contextHolder}
      <div className="h-screen flex flex-col">
        {isShowDetail ? (
          <>
            <header className="h-16 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Button
                  icon={<LeftOutlined />}
                  type="text"
                  onClick={onReturnNode}
                />
                <h1 className="text-2xl font-bold">{i18n("node.detail")}</h1>
              </div>
              <div className="flex space-x-2 items-center mr-2">
                <p className="text-base">{i18n("common.current_cluster")}</p>
                <Select
                  placeholder={i18n("cluster.select_cluster")}
                  value={currentCluster.id}
                  style={{ width: 120 }}
                  onChange={onSelectCluster}
                  options={clusters.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
              </div>
            </header>

            {isLoadingDetail ? (
              <Skeleton active />
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 mb-2">
                {clusterNodes.nodes.map((node) => (
                  <div className="mt-2">
                    <Descriptions
                      title={
                        <div className="space-x-2">
                          <span>{node.id}</span>
                          {node.roles.includes("master") && (
                            <Tag color={theme.Color.primary}>
                              {i18n("node.table_master")}
                            </Tag>
                          )}
                        </div>
                      }
                      bordered
                      column={3}
                    >
                      <Descriptions.Item
                        label={i18n("node.detail_name")}
                        span={2}
                      >
                        {node.name}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={i18n("node.detail_version")}
                        span={1}
                      >
                        {node.version}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={i18n("node.detail_roles")}
                        span={3}
                      >
                        <div className="space-y-2">
                          {node.roles.map((role) => (
                            <Tag color={theme.Color.secondary}>{role}</Tag>
                          ))}
                        </div>
                      </Descriptions.Item>
                      <Descriptions.Item label={i18n("node.detail_host")}>
                        {node.host}
                      </Descriptions.Item>
                      <Descriptions.Item label={i18n("node.detail_ip")}>
                        {node.ip}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={i18n("node.detail_transport_address")}
                      >
                        {node.transport_address}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={i18n("node.detail_total_indexing_buffer")}
                        span={3}
                      >
                        <Statistic value={node.total_indexing_buffer} />
                      </Descriptions.Item>

                      <Descriptions.Item
                        label={i18n("node.detail_os")}
                        span={3}
                      >
                        {i18n("node.detail_os_name")}
                        {node.os_name} <br />
                        {i18n("node.detail_os_arch")}
                        {node.os_arch} <br />
                        {i18n("node.detail_os_version")}
                        {node.os_version}
                      </Descriptions.Item>

                      <Descriptions.Item label={i18n("node.detail_process")}>
                        {i18n("node.detail_process_id")}
                        {node.process_id} <br />
                        {i18n("node.detail_process_refresh_interval")}
                        {node.process_refresh_interval_in_millis}
                        <br />
                        {i18n("node.detail_process_mlockall")}
                        {node.process_mlockall ? "true" : "false"}
                        <br />
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <header className="h-16 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold">{i18n("node.node")}</h1>
                <span>
                  {i18n("node.total_num", { num: `${nodeData.length}` })}
                </span>
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  shape="circle"
                  loading={isLoading}
                  onClick={onRefreshNode}
                />
                <Button type="link" onClick={onShowDetail}>
                  {i18n("node.show_detail")}
                </Button>
              </div>
              <div className="flex space-x-2 items-center mr-2">
                <p className="text-base">{i18n("common.current_cluster")}</p>
                <Select
                  placeholder={i18n("cluster.select_cluster")}
                  value={currentCluster.id}
                  style={{ width: 120 }}
                  onChange={onSelectCluster}
                  options={clusters.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
              </div>
            </header>
            <div>
              <Table<NodeData>
                showSorterTooltip={false}
                columns={columns}
                dataSource={nodeData}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
